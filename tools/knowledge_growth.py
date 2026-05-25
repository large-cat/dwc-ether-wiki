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
    - wiki/cache/*.txt            → PDF cache content
    - wiki/cache.json             → cache index (key → path)

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
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

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
CACHE_PATH = WIKI_DIR / "cache.json"


# ═══════════════════════════════════════════════════════════════════════════════
# PDF READER (raw/ layer — immutable, read-only)
# ═══════════════════════════════════════════════════════════════════════════════

def _resolve_pdf(pdf_name: str = None) -> Path:
    """Resolve PDF path from raw/ directory."""
    if pdf_name:
        p = RAW_DIR / pdf_name
        if p.exists():
            return p
        if not pdf_name.endswith(".pdf"):
            p = RAW_DIR / (pdf_name + ".pdf")
            if p.exists():
                return p
        raise FileNotFoundError(f"PDF not found in raw/: {pdf_name}")

    if DEFAULT_PDF.exists():
        return DEFAULT_PDF

    pdfs = list(RAW_DIR.glob("*.pdf"))
    if pdfs:
        return pdfs[0]

    raise FileNotFoundError(f"No PDF found in {RAW_DIR}")


def _read_pdf_raw(page_start: int, page_end: int, pdf_path: Path = None) -> str:
    """Read PDF pages from raw/ directory. The ONLY function that touches raw/."""
    pdf_file = pdf_path or _resolve_pdf()

    try:
        import PyPDF2
    except ImportError:
        return "[ERROR] PyPDF2 not installed. Run: pip install PyPDF2"

    skip_patterns = [
        "Synopsys, Inc.", "SolvNet", "DesignWare.com",
        "Ethernet Quality-of-Service Databook",
        "Destination Control Statement", "Disclaimer",
        "Trademarks", "Third-Party Links", "www.synopsys.com",
        "December 2017", "5.10a", "Copyright Notice",
        "Continued on next page", "Version 5.10a",
        "Open-source-documentation-tutorial",
    ]

    texts = []
    try:
        with open(pdf_file, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            total_pdf_pages = len(reader.pages)

            for i in range(page_start - 1, min(page_end, total_pdf_pages)):
                page = reader.pages[i]
                text = page.extract_text()
                if not text:
                    continue

                lines = text.split("\n")
                cleaned = []
                for line in lines:
                    stripped = line.strip()
                    if any(stripped.startswith(p) for p in skip_patterns):
                        continue
                    if stripped and len(stripped) > 3:
                        cleaned.append(stripped)

                page_text = "\n".join(cleaned)
                if len(page_text) > 50:
                    texts.append(f"--- Page {i+1} ---\n{page_text}")
    except Exception as e:
        return f"[ERROR] Failed to read PDF pages {page_start}-{page_end}: {e}"

    return "\n\n".join(texts)


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


def _cache_content_path(cache_key: str) -> str:
    """Generate the relative content path for a cache entry."""
    return f"cache/cache_{cache_key}.txt"


def _save_cache_content(content_path: str, content: str) -> None:
    """Save cache content to wiki/cache/*.txt."""
    CACHE_DIR.mkdir(exist_ok=True)
    filepath = WIKI_DIR / content_path
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)


def _load_cache_content(content_path: str) -> str:
    """Load cache content from wiki/cache/*.txt."""
    filepath = WIKI_DIR / content_path
    if not filepath.exists():
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _load_cache() -> Dict[str, Any]:
    """Load cache index from wiki/cache.json."""
    if not CACHE_PATH.exists():
        return {"entries": {}, "total_chars_cached": 0}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"entries": {}, "total_chars_cached": 0}


def _save_cache(cache: Dict[str, Any]) -> None:
    """Save cache index to wiki/cache.json."""
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


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
            import PyPDF2
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                page_count = len(reader.pages)
        except:
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
# CORE: Lazy Content Loading (cache-first)
# ═══════════════════════════════════════════════════════════════════════════════

def get_or_load_content(chapter_id: str, page_start: int = None,
                        page_end: int = None, pdf_name: str = None) -> str:
    """
    Cache-first lazy loader. THE KEY FUNCTION of the knowledge engine.

    Flow:
        1. Check wiki cache → if hit, return cached content (from .txt file)
        2. If miss → read from raw/ PDF → cache to .txt → return
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
        pdf_path = _resolve_pdf(pdf_name) if pdf_name else _resolve_pdf()
    except FileNotFoundError as e:
        return f"[ERROR] {e}"

    start = page_start or chapter["page_start"]
    end = page_end or min(chapter["page_end"], start + 10)
    cache_key = f"{chapter_id}_p{start}-{end}"

    # STEP 1: Check wiki cache FIRST
    cache_data = _load_cache()
    if cache_key in cache_data["entries"]:
        content_path = cache_data["entries"][cache_key]
        content = _load_cache_content(content_path)
        print(f"  [CACHE HIT] {cache_key} ({len(content)} chars)")
        return content

    # STEP 2: CACHE MISS → Read from raw/
    print(f"  [CACHE MISS] {cache_key} → reading raw/ PDF p.{start}-{end}...")
    content = _read_pdf_raw(start, end, pdf_path)

    if content.startswith("[ERROR]"):
        return content

    # Save to wiki cache (.txt file)
    content_path = _cache_content_path(cache_key)
    _save_cache_content(content_path, content)
    cache_data["entries"][cache_key] = content_path
    cache_data["total_chars_cached"] = cache_data.get("total_chars_cached", 0) + len(content)
    _save_cache(cache_data)

    # Update chapter stats
    chapter["reads_count"] = chapter.get("reads_count", 0) + 1
    chapter["last_read"] = datetime.now().isoformat()
    tree["metadata"]["total_reads_from_pdf"] = tree["metadata"].get("total_reads_from_pdf", 0) + 1

    if chapter["status"] == "seeded":
        chapter["status"] = "explored"
        print(f"  [GROWTH] {chapter_id}: seeded → explored")

    _save_tree(tree)
    print(f"  [SAVED] {cache_key}: {len(content)} chars cached to wiki/cache/")
    return content


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

def search_knowledge(query: str, max_results: int = 5) -> list:
    """Search chapters, cached content, and knowledge leaves. No PDF read."""
    tree = _load_tree()
    query_lower = query.lower()
    query_terms = [t for t in re.split(r'[\s,，。]+', query_lower) if len(t) > 1]

    cache_data = _load_cache()
    results = []
    for ch in tree["chapters"]:
        searchable = " ".join(filter(None, [
            ch.get("title", ""), ch.get("title_cn", ""),
            ch.get("description", ""),
        ])).lower()

        # Search cached content (read from .txt files)
        cached_content = ""
        for cache_key, content_path in cache_data["entries"].items():
            if cache_key.startswith(ch["id"] + "_"):
                content = _load_cache_content(content_path)
                cached_content += " " + content.lower()

        full_text = searchable + " " + cached_content

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
                k.startswith(ch["id"] + "_")
                for k in cache_data["entries"].keys()
            )
            results.append({
                "chapter": ch,
                "relevance": score,
                "has_cached_content": has_cache,
                "cache_keys": [
                    k for k in cache_data["entries"].keys()
                    if k.startswith(ch["id"] + "_")
                ]
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

    cache_data = _load_cache()
    cache_entries = len(cache_data["entries"])

    # Calculate total cache chars from files
    cache_chars = 0
    for key, path in cache_data["entries"].items():
        content = _load_cache_content(path)
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
        "cache_entries": cache_entries,
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
    print(f"Cache Entries:  {stats['cache_entries']}")
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
        print("DWC Ethernet QoS Knowledge Growth Engine v2.2")
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
