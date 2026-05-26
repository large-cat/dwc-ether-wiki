#!/usr/bin/env python3
"""
DWC Ethernet QoS — Lazy-Loading Knowledge Growth Engine
========================================================

Follows llm-wiki three-layer architecture:
    raw/     → Immutable source documents (PDF databook)
    wiki/    → LLM-managed knowledge (growing_knowledge_tree.json + leaves/*.txt + cache/*.txt)
    site/    → Built frontend (React SPA)
    tools/   → This file — knowledge growth engine

CORE PRINCIPLE: Never bulk-extract PDF. Only read specific pages when a
question requires knowledge not already in the tree. Cache everything.

Content storage:
    - growing_knowledge_tree.json → chapters + leaf metadata (no content)
    - wiki/leaves/*.txt           → leaf XML content
    - wiki/cache/*.txt            → PDF cache content (Markdown, per segment)
    - wiki/cache.json             → cache segment index

Cache rules:
    - Segments are contiguous page ranges (max 10 pages each).
    - Overlapping reads are merged into one larger segment.
    - Segments exceeding 10 pages are truncated to the next 10-page boundary.

Usage:
    # CLI
    python tools/knowledge_growth.py stats
    python tools/knowledge_growth.py search "RGMII"
    python tools/knowledge_growth.py read ch5

    # In Python / Claude Code
    from tools.knowledge_growth import search_knowledge, get_or_load_content
    results = search_knowledge("RGMII")
    content = get_or_load_content("ch5")
"""

import json
import re
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS — All relative to project root
# ═══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Ensure tools/ is importable when run directly
sys.path.insert(0, str(PROJECT_ROOT))

# PDF engine with structure-aware extraction
from tools.pdf_cache import resolve_pdf, read_pdf_pages

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS — All relative to project root
# ═══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
RAW_DIR = PROJECT_ROOT / "raw"
WIKI_DIR = PROJECT_ROOT / "wiki"
TOOLS_DIR = PROJECT_ROOT / "tools"

DEFAULT_PDF = RAW_DIR / "DWC_ether_qos_databook.pdf"
TREE_PATH = WIKI_DIR / "growing_knowledge_tree.json"
LEAVES_DIR = WIKI_DIR / "leaves"
CACHE_DIR = WIKI_DIR / "cache"
CACHE_INDEX_PATH = WIKI_DIR / "cache.json"

MAX_CACHE_SEGMENT_PAGES = 10


# ═══════════════════════════════════════════════════════════════════════════════
# WIKI I/O (wiki/ layer — LLM-managed, read-write)
# ═══════════════════════════════════════════════════════════════════════════════

def _load_tree() -> dict:
    """Load the knowledge tree from wiki/growing_knowledge_tree.json."""
    with open(TREE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_tree(tree: dict) -> None:
    """Save the knowledge tree to wiki/growing_knowledge_tree.json."""
    tree["metadata"]["last_updated"] = datetime.now().isoformat()
    with open(TREE_PATH, "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)


def _make_slug(topic: str) -> str:
    """Generate a URL-safe slug from a topic string."""
    slug = re.sub(r'[^\w一-鿿\s-]', '', topic)
    slug = re.sub(r'\s+', '_', slug.strip())
    return slug


def _leaf_content_path(leaf_id: str, topic: str) -> str:
    """Generate the relative content path for a leaf."""
    slug = _make_slug(topic)
    filename = f"leaf_{leaf_id}_{slug}.txt"
    return f"leaves/{filename}"


def _save_leaf_content(content_path: str, content: str) -> None:
    """Save leaf content to wiki/leaves/*.txt."""
    LEAVES_DIR.mkdir(exist_ok=True)
    filepath = WIKI_DIR / content_path
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)


def _load_leaf_content(content_path: str) -> str:
    """Load leaf content from wiki/leaves/*.txt."""
    filepath = WIKI_DIR / content_path
    if not filepath.exists():
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


# ═══════════════════════════════════════════════════════════════════════════════
# CACHE SEGMENT INDEX (cache.json — segment-oriented)
# ═══════════════════════════════════════════════════════════════════════════════

def _load_cache_index() -> dict:
    """Load cache index. Supports both legacy 'entries' and new 'segments' formats."""
    if not CACHE_INDEX_PATH.exists():
        return {"version": "2.0", "segments": []}
    try:
        with open(CACHE_INDEX_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"version": "2.0", "segments": []}

    # Migrate legacy format (entries dict) to new segment list
    if "entries" in data and isinstance(data["entries"], dict):
        segments = []
        for key, path in data["entries"].items():
            m = re.match(r"^(ch\d+|app[a-z])_p(\d+)-(\d+)$", key)
            if m:
                segments.append({
                    "key": key,
                    "chapter_id": m.group(1),
                    "page_start": int(m.group(2)),
                    "page_end": int(m.group(3)),
                    "file": path,
                    "created_at": datetime.now().isoformat(),
                    "last_accessed": datetime.now().isoformat(),
                })
        data = {"version": "2.0", "segments": segments}
        _save_cache_index(data)
    return data


def _save_cache_index(data: dict) -> None:
    """Save cache index to wiki/cache.json."""
    with open(CACHE_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find_covering_segment(chapter_id: str, start: int, end: int) -> Optional[dict]:
    """Find a single cache segment that fully covers [start, end]."""
    data = _load_cache_index()
    for seg in data.get("segments", []):
        if seg.get("chapter_id") == chapter_id:
            if seg.get("page_start", 0) <= start and seg.get("page_end", 0) >= end:
                return seg
    return None


def _find_overlapping_segments(chapter_id: str, start: int, end: int) -> List[dict]:
    """Find all cache segments overlapping [start, end]."""
    data = _load_cache_index()
    overlapping = []
    for seg in data.get("segments", []):
        if seg.get("chapter_id") != chapter_id:
            continue
        s = seg.get("page_start", 0)
        e = seg.get("page_end", 0)
        if s <= end and e >= start:
            overlapping.append(seg)
    return overlapping


def _delete_segment_files(segments: List[dict]) -> None:
    """Delete cache segment files from disk."""
    for seg in segments:
        filepath = WIKI_DIR / seg.get("file", "")
        if filepath.exists():
            filepath.unlink()


def _save_segment(chapter_id: str, start: int, end: int, content: str) -> dict:
    """Save a cache segment to disk and return its metadata."""
    CACHE_DIR.mkdir(exist_ok=True)
    key = f"{chapter_id}_p{start}-{end}"
    rel_path = f"cache/cache_{key}.txt"
    filepath = WIKI_DIR / rel_path
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return {
        "key": key,
        "chapter_id": chapter_id,
        "page_start": start,
        "page_end": end,
        "file": rel_path,
        "created_at": datetime.now().isoformat(),
        "last_accessed": datetime.now().isoformat(),
    }


def _load_segment_content(seg: dict) -> str:
    """Load content from a cache segment file."""
    filepath = WIKI_DIR / seg.get("file", "")
    if not filepath.exists():
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _update_segment_access(key: str) -> None:
    """Update last_accessed timestamp for a cache segment."""
    data = _load_cache_index()
    for seg in data.get("segments", []):
        if seg.get("key") == key:
            seg["last_accessed"] = datetime.now().isoformat()
            break
    _save_cache_index(data)


def _extract_page_range(content: str, start: int, end: int) -> str:
    """Extract pages [start, end] from cached Markdown content using ## Page N headers."""
    lines = content.split("\n")
    result = []
    in_range = False
    current_page = None

    for line in lines:
        m = re.match(r"^## Page (\d+)$", line.strip())
        if m:
            current_page = int(m.group(1))
            in_range = start <= current_page <= end

        if in_range:
            result.append(line)

    return "\n".join(result)


# ═══════════════════════════════════════════════════════════════════════════════
# RAW SCANNER — Detect new documents in raw/
# ═══════════════════════════════════════════════════════════════════════════════

def scan_raw_for_new_docs() -> List[Dict[str, Any]]:
    """Scan raw/ directory for documents not yet tracked."""
    tree = _load_tree()
    tracked = set()
    meta_doc = tree.get("metadata", {}).get("document", "")
    if meta_doc:
        tracked.add(meta_doc)

    for doc in tree.get("metadata", {}).get("documents", []):
        if isinstance(doc, dict):
            tracked.add(doc.get("filename", ""))
        elif isinstance(doc, str):
            tracked.add(doc)

    new_docs = []
    for file_path in sorted(RAW_DIR.iterdir()):
        if file_path.suffix.lower() == ".pdf":
            filename = file_path.name
            if filename not in tracked:
                new_docs.append({
                    "filename": filename,
                    "path": str(file_path.relative_to(PROJECT_ROOT)),
                    "size": file_path.stat().st_size,
                    "size_human": f"{file_path.stat().st_size / 1024 / 1024:.1f} MB",
                    "detected_type": "PDF",
                    "suggested_action": "Add to knowledge tree with add_document()"
                })

    return new_docs


def add_document(filename: str, title: str, page_count: int = None,
                 description: str = "") -> Dict[str, Any]:
    """Add a new document from raw/ to the knowledge tree."""
    pdf_path = RAW_DIR / filename
    if not pdf_path.exists():
        raise FileNotFoundError(f"Document not found in raw/: {filename}")

    if page_count is None:
        try:
            import fitz
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            doc.close()
        except Exception:
            page_count = 0

    tree = _load_tree()
    if "documents" not in tree["metadata"]:
        tree["metadata"]["documents"] = []

    doc_entry = {
        "filename": filename,
        "title": title,
        "page_count": page_count,
        "description": description,
        "added_at": datetime.now().isoformat(),
        "status": "indexed"
    }
    tree["metadata"]["documents"].append(doc_entry)
    _save_tree(tree)
    print(f"[NEW DOC] Added '{title}' ({filename}, {page_count} pages)")
    return doc_entry


# ═══════════════════════════════════════════════════════════════════════════════
# CORE: Lazy Content Loading with Segment Cache
# ═══════════════════════════════════════════════════════════════════════════════

def get_or_load_content(chapter_id: str, page_start: int = None,
                        page_end: int = None, pdf_name: str = None) -> str:
    """
    Cache-first lazy loader with segment-level caching.

    Rules:
        - Cache segments are contiguous page ranges (max 10 pages).
        - Overlapping reads merge into a larger segment (up to 10 pages).
        - Segments are stored in wiki/cache/*.txt and indexed in cache.json.
    """
    tree = _load_tree()

    chapter = None
    for ch in tree["chapters"]:
        if ch["id"] == chapter_id:
            chapter = ch
            break

    if not chapter:
        return f"[ERROR] Chapter {chapter_id} not found."

    try:
        pdf_path = resolve_pdf(pdf_name) if pdf_name else resolve_pdf()
    except FileNotFoundError as e:
        return f"[ERROR] {e}"

    # Determine request range, clamped to chapter bounds
    req_start = page_start or chapter["page_start"]
    req_end = page_end or min(chapter["page_end"], req_start + 9)
    req_start = max(req_start, chapter["page_start"])
    req_end = min(req_end, chapter["page_end"])

    if req_start > req_end:
        return f"[ERROR] Invalid page range: {req_start}-{req_end}"

    all_parts = []
    total_pages_read = 0
    current_start = req_start

    while current_start <= req_end:
        # Work in at-most-10-page chunks
        chunk_end = min(current_start + 9, req_end, chapter["page_end"])

        # 1. Check if a cache segment fully covers this chunk
        covering = _find_covering_segment(chapter_id, current_start, chunk_end)
        if covering:
            _update_segment_access(covering["key"])
            content = _load_segment_content(covering)
            part = _extract_page_range(content, current_start, chunk_end)
            all_parts.append(part)
            current_start = chunk_end + 1
            continue

        # 2. Find overlapping cache segments for this chunk
        overlapping = _find_overlapping_segments(chapter_id, current_start, chunk_end)

        # 3. Compute merged range
        merged_start = current_start
        merged_end = chunk_end
        for seg in overlapping:
            merged_start = min(merged_start, seg.get("page_start", merged_start))
            merged_end = max(merged_end, seg.get("page_end", merged_end))

        merged_start = max(merged_start, chapter["page_start"])
        merged_end = min(merged_end, chapter["page_end"])

        # 4. Cap at MAX_CACHE_SEGMENT_PAGES; anchor so merged_start <= current_start
        if merged_end - merged_start + 1 > MAX_CACHE_SEGMENT_PAGES:
            # Try anchoring at current_start first
            candidate_end = current_start + MAX_CACHE_SEGMENT_PAGES - 1
            if candidate_end >= merged_end:
                # Anchoring at current_start covers everything
                merged_start = current_start
                merged_end = candidate_end
            else:
                # Still too big: truncate from merged_start
                merged_end = merged_start + MAX_CACHE_SEGMENT_PAGES - 1

        merged_end = min(merged_end, chapter["page_end"])

        # Ensure we don't go backwards
        if merged_end < current_start:
            merged_start = current_start
            merged_end = min(current_start + MAX_CACHE_SEGMENT_PAGES - 1, chapter["page_end"])

        # 5. Read from PDF
        pages_read = merged_end - merged_start + 1
        total_pages_read += pages_read
        print(f"  [PDF READ] {chapter_id} p.{merged_start}-{merged_end}...")

        content = read_pdf_pages(merged_start, merged_end, pdf_path, images_dir=None)
        if content.startswith("[ERROR]"):
            return content

        # 6. Delete old overlapping cache files + index entries
        if overlapping:
            overlapping_keys = {seg["key"] for seg in overlapping}
            _delete_segment_files(overlapping)
            data = _load_cache_index()
            data["segments"] = [s for s in data.get("segments", []) if s["key"] not in overlapping_keys]
            _save_cache_index(data)

        # 7. Save new segment
        new_seg = _save_segment(chapter_id, merged_start, merged_end, content)
        data = _load_cache_index()
        data["segments"].append(new_seg)
        _save_cache_index(data)

        # 8. Extract requested portion from this chunk
        return_start = max(current_start, merged_start)
        return_end = min(chunk_end, merged_end)
        part = _extract_page_range(content, return_start, return_end)
        all_parts.append(part)

        current_start = return_end + 1

    # Update chapter stats (once, after all chunks)
    if total_pages_read > 0:
        chapter["reads_count"] = chapter.get("reads_count", 0) + total_pages_read
        chapter["last_read"] = datetime.now().isoformat()
        tree["metadata"]["total_reads_from_pdf"] = tree["metadata"].get("total_reads_from_pdf", 0) + total_pages_read

        if chapter["status"] == "seeded":
            chapter["status"] = "explored"
            print(f"  [GROWTH] {chapter_id}: seeded → explored")

        _save_tree(tree)
        print(f"  [DONE] {total_pages_read} page(s) read from raw/ for {chapter_id}")

    return "\n\n".join(all_parts)


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

def search_knowledge(query: str, max_results: int = 5) -> list:
    """Search chapters, cached content, and knowledge leaves. No PDF read."""
    tree = _load_tree()
    query_lower = query.lower()
    query_terms = [t for t in re.split(r'[\s,，。]+', query_lower) if len(t) > 1]

    cache_data = _load_cache_index()
    results = []
    for ch in tree["chapters"]:
        searchable = " ".join(filter(None, [
            ch.get("title", ""), ch.get("title_cn", ""),
            ch.get("description", ""),
        ])).lower()

        # Search cached content (read from .txt files)
        cached_content = ""
        for seg in cache_data.get("segments", []):
            if seg.get("chapter_id") == ch["id"]:
                content = _load_segment_content(seg)
                cached_content += " " + content.lower()

        # Search knowledge leaves for this chapter
        leaves_text = ""
        for leaf in tree.get("leaves", []):
            if leaf["chapter_id"] == ch["id"]:
                leaves_text += " " + leaf["topic"].lower()
                content = _load_leaf_content(leaf.get("content_path", ""))
                leaves_text += " " + content.lower()

        full_text = searchable + " " + cached_content + " " + leaves_text

        score = 0
        if query_lower in full_text:
            score += 10
        for term in query_terms:
            if term in full_text:
                score += 3
        if query_lower in ch.get("title", "").lower() or query_lower in ch.get("title_cn", "").lower():
            score += 8

        if score > 0:
            has_cache = any(
                seg.get("chapter_id") == ch["id"]
                for seg in cache_data.get("segments", [])
            )
            cache_keys = [
                seg["key"] for seg in cache_data.get("segments", [])
                if seg.get("chapter_id") == ch["id"]
            ]
            results.append({
                "chapter": ch,
                "relevance": score,
                "has_cached_content": has_cache,
                "cache_keys": cache_keys,
            })

    results.sort(key=lambda x: x["relevance"], reverse=True)
    return results[:max_results]


# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE LEAVES
# ═══════════════════════════════════════════════════════════════════════════════

def add_knowledge_leaf(chapter_id: str, topic: str, content: str,
                        source: str = "QA enrichment", confidence: str = "high") -> str:
    """Add a persistent knowledge leaf. Content saved to .txt, metadata to tree."""
    tree = _load_tree()

    chapter = None
    for ch in tree["chapters"]:
        if ch["id"] == chapter_id:
            chapter = ch
            break
    if not chapter:
        raise ValueError(f"Chapter {chapter_id} not found")

    if "leaves" not in tree:
        tree["leaves"] = []

    chapter_leaves = [l for l in tree["leaves"] if l["chapter_id"] == chapter_id]
    seq = len(chapter_leaves) + 1
    leaf_id = f"leaf_{chapter_id}_{seq}"

    content_path = _leaf_content_path(leaf_id, topic)
    _save_leaf_content(content_path, content)

    leaf = {
        "id": leaf_id,
        "chapter_id": chapter_id,
        "chapter_title": chapter.get("title_cn", chapter.get("title", "")),
        "topic": topic,
        "content_path": content_path,
        "source": source,
        "confidence": confidence,
        "created_at": datetime.now().isoformat(),
        "access_count": 0,
        "status": "active",
    }

    tree["leaves"].append(leaf)
    tree["metadata"]["total_knowledge_leaves_created"] = len(tree["leaves"])

    # Status transitions
    active_count = sum(1 for l in chapter_leaves if l.get("status") != "archived")
    if active_count >= 3 and chapter["status"] == "explored":
        chapter["status"] = "growing"
        print(f"  [GROWTH] {chapter_id}: explored → growing ({active_count} leaves)")
    elif active_count >= 8 and chapter["status"] == "growing":
        chapter["status"] = "mature"
        print(f"  [GROWTH] {chapter_id}: growing → mature ({active_count} leaves)")

    _save_tree(tree)
    print(f"  [LEAF] {leaf_id}: {topic}")
    return leaf_id


def find_leaves(query: str = None, chapter_id: str = None,
                max_results: int = 10, include_archived: bool = False) -> list:
    """Find knowledge leaves by query or chapter."""
    tree = _load_tree()
    leaves = tree.get("leaves", [])

    if chapter_id:
        leaves = [l for l in leaves if l["chapter_id"] == chapter_id]

    if not include_archived:
        leaves = [l for l in leaves if l.get("status") != "archived"]

    if query:
        query_lower = query.lower()
        scored = []
        for leaf in leaves:
            content = _load_leaf_content(leaf.get("content_path", ""))
            text = f"{leaf['topic']} {content}".lower()
            score = 0
            if query_lower in text:
                score += 10
            for term in query_lower.split():
                if len(term) > 1 and term in text:
                    score += 2
            if score > 0:
                scored.append((score, leaf))
        scored.sort(key=lambda x: x[0], reverse=True)
        leaves = [l for _, l in scored]

    return leaves[:max_results]


def merge_leaves(source_ids: List[str], new_topic: str,
                 new_content: str, source: str = "compilation") -> str:
    """Merge multiple leaves into one new leaf, archive sources."""
    tree = _load_tree()
    leaves = tree.get("leaves", [])

    sources = [l for l in leaves if l["id"] in source_ids]
    if len(sources) < 2:
        raise ValueError("Need at least 2 leaves to merge")

    chapter_id = sources[0]["chapter_id"]
    chapter = next((c for c in tree["chapters"] if c["id"] == chapter_id), None)
    chapter_leaves = [l for l in leaves if l["chapter_id"] == chapter_id]

    seq = len(chapter_leaves) + 1
    new_id = f"leaf_{chapter_id}_{seq}"

    content_path = _leaf_content_path(new_id, new_topic)
    _save_leaf_content(content_path, new_content)

    now = datetime.now().isoformat()
    new_leaf = {
        "id": new_id,
        "chapter_id": chapter_id,
        "chapter_title": chapter.get("title_cn", "") if chapter else "",
        "topic": new_topic,
        "content_path": content_path,
        "source": source,
        "confidence": "high",
        "created_at": now,
        "access_count": 0,
        "status": "active",
    }
    tree["leaves"].append(new_leaf)

    for leaf in sources:
        leaf["status"] = "archived"
        leaf["archived_at"] = now
        leaf["archived_reason"] = "merged"
        leaf["replaced_by"] = new_id

    _save_tree(tree)
    print(f"  [MERGE] {new_id}: {new_topic} (from {len(sources)} leaves)")
    return new_id


def split_leaf(source_id: str, parts: List[Dict[str, str]],
               source: str = "compilation") -> List[str]:
    """Split one leaf into multiple new leaves, archive source."""
    tree = _load_tree()
    leaves = tree.get("leaves", [])

    src = next((l for l in leaves if l["id"] == source_id), None)
    if not src:
        raise ValueError(f"Leaf {source_id} not found")
    if len(parts) < 2:
        raise ValueError("Need at least 2 parts to split into")

    chapter_id = src["chapter_id"]
    chapter = next((c for c in tree["chapters"] if c["id"] == chapter_id), None)
    chapter_leaves = [l for l in leaves if l["chapter_id"] == chapter_id]

    now = datetime.now().isoformat()
    new_ids = []

    for part in parts:
        seq = len(chapter_leaves) + len(new_ids) + 1
        new_id = f"leaf_{chapter_id}_{seq}"
        content_path = _leaf_content_path(new_id, part["topic"])
        _save_leaf_content(content_path, part["content"])

        new_leaf = {
            "id": new_id,
            "chapter_id": chapter_id,
            "chapter_title": chapter.get("title_cn", "") if chapter else "",
            "topic": part["topic"],
            "content_path": content_path,
            "source": source,
            "confidence": src.get("confidence", "high"),
            "created_at": now,
            "access_count": 0,
            "status": "active",
        }
        tree["leaves"].append(new_leaf)
        new_ids.append(new_id)

    # Archive the source leaf
    for leaf in leaves:
        if leaf["id"] == source_id:
            leaf["status"] = "archived"
            leaf["archived_at"] = now
            leaf["archived_reason"] = "split"
            leaf["replaced_by"] = new_ids[0] if len(new_ids) == 1 else None
            break

    _save_tree(tree)
    print(f"  [SPLIT] {source_id} → {len(new_ids)} leaves: {', '.join(new_ids)}")
    return new_ids


# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

def get_stats() -> dict:
    """Get comprehensive growth statistics."""
    tree = _load_tree()
    m = tree["metadata"]

    status_counts = {"seeded": 0, "explored": 0, "growing": 0, "mature": 0}
    for ch in tree["chapters"]:
        status_counts[ch.get("status", "seeded")] += 1

    cache_data = _load_cache_index()
    cache_segments = len(cache_data.get("segments", []))
    cache_chars = 0
    for seg in cache_data.get("segments", []):
        content = _load_segment_content(seg)
        cache_chars += len(content)

    all_leaves = tree.get("leaves", [])

    raw_docs = []
    if RAW_DIR.exists():
        raw_docs = [
            {"filename": f.name, "size": f.stat().st_size}
            for f in sorted(RAW_DIR.iterdir())
            if f.suffix.lower() == ".pdf"
        ]

    return {
        "document": m.get("document", "N/A"),
        "version": m.get("knowledge_tree_version", "?"),
        "total_chapters": len(tree["chapters"]),
        "chapters_status": status_counts,
        "total_pdf_reads": m.get("total_reads_from_pdf", 0),
        "total_leaves": len(all_leaves),
        "cache_segments": cache_segments,
        "cache_chars": cache_chars,
        "raw_documents": raw_docs,
        "last_updated": m.get("last_updated", "N/A")
    }


def print_stats():
    """Pretty-print growth statistics."""
    stats = get_stats()
    s = stats["chapters_status"]
    print("\n" + "="*50)
    print("KNOWLEDGE TREE GROWTH STATISTICS")
    print("="*50)
    print(f"Document:       {stats['document']}")
    print(f"Tree Version:   {stats['version']}")
    print(f"Chapters:       {stats['total_chapters']}")
    print(f"  Seeded:       {s['seeded']}")
    print(f"  Explored:     {s['explored']}")
    print(f"  Growing:      {s['growing']}")
    print(f"  Mature:       {s['mature']}")
    print(f"PDF Reads:      {stats['total_pdf_reads']}")
    print(f"Leaves:         {stats['total_leaves']}")
    print(f"Cache Segments: {stats['cache_segments']}")
    print(f"Cache Size:     {stats['cache_chars']:,} chars")
    print(f"raw/ Documents: {len(stats['raw_documents'])}")
    for doc in stats['raw_documents']:
        print(f"  - {doc['filename']} ({doc['size']/1024/1024:.1f} MB)")
    print(f"Last Updated:   {stats['last_updated']}")
    print("="*50)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("DWC Ethernet QoS Knowledge Growth Engine v3.0")
        print("")
        print("Commands:")
        print("  stats                          Show growth statistics")
        print("  scan                           Scan raw/ for new documents")
        print("  search <query>                 Search knowledge tree")
        print("  read <chapter_id> [pages]      Read PDF for chapter (lazy)")
        print("  leaves [chapter_id]            List knowledge leaves")
        print("  add-leaf <ch_id> <topic> <content>  Add a knowledge leaf")
        print("  add-doc <filename> <title>     Add document from raw/")
        print("")
        print("Examples:")
        print('  python tools/knowledge_growth.py scan')
        print('  python tools/knowledge_growth.py search "RGMII"')
        print('  python tools/knowledge_growth.py read ch5')
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "stats":
        print_stats()

    elif cmd == "scan":
        docs = scan_raw_for_new_docs()
        if docs:
            print(f"Found {len(docs)} new document(s) in raw/:")
            for d in docs:
                print(f"  → {d['filename']} ({d['size_human']})")
        else:
            print("No new documents in raw/. All tracked.")

    elif cmd == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else "RGMII"
        results = search_knowledge(query)
        for r in results:
            ch = r["chapter"]
            cache_status = "CACHED" if r["has_cached_content"] else "NOT CACHED"
            print(f"[{r['relevance']}] {ch['id']}: {ch['title_cn']} "
                  f"(p.{ch['page_start']}-{ch['page_end']}) [{cache_status}]")

    elif cmd == "read":
        ch_id = sys.argv[2] if len(sys.argv) > 2 else "ch5"
        pages = int(sys.argv[3]) if len(sys.argv) > 3 else 5

        tree = _load_tree()
        ch = next((c for c in tree["chapters"] if c["id"] == ch_id), None)
        if not ch:
            print(f"Chapter {ch_id} not found")
            sys.exit(1)

        content = get_or_load_content(ch_id, ch["page_start"],
                                       min(ch["page_start"] + pages - 1, ch["page_end"]))
        print(content[:2000])

    elif cmd == "leaves":
        ch_id = sys.argv[2] if len(sys.argv) > 2 else None
        leaves = find_leaves(chapter_id=ch_id)
        for leaf in leaves:
            content = _load_leaf_content(leaf.get("content_path", ""))
            print(f"[{leaf['id']}] {leaf['topic']} ({leaf['chapter_title']})")
            print(f"  {content[:100]}...")

    elif cmd == "add-leaf":
        if len(sys.argv) < 5:
            print("Usage: add-leaf <chapter_id> <topic> <content>")
            sys.exit(1)
        leaf_id = add_knowledge_leaf(sys.argv[2], sys.argv[3], sys.argv[4])
        print(f"Created: {leaf_id}")

    elif cmd == "add-doc":
        if len(sys.argv) < 4:
            print("Usage: add-doc <filename> <title> [page_count] [description]")
            sys.exit(1)
        doc = add_document(sys.argv[2], sys.argv[3],
                          int(sys.argv[4]) if len(sys.argv) > 4 else None,
                          sys.argv[5] if len(sys.argv) > 5 else "")
        print(f"Added: {doc}")

    else:
        print(f"Unknown command: {cmd}")
