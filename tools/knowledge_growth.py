#!/usr/bin/env python3
"""
DWC Ethernet QoS — Lazy-Loading Knowledge Growth Engine
========================================================

Follows llm-wiki three-layer architecture:
    raw/     → Immutable source documents (PDF databook)
    wiki/    → LLM-managed knowledge (growing_knowledge_tree.json)
    site/    → Built frontend (React SPA)
    tools/   → This file — knowledge growth engine

CORE PRINCIPLE: Never bulk-extract PDF. Only read specific pages when a
question requires knowledge not already in the tree. Cache everything.

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

# Resolve paths: tools/knowledge_growth.py → project root
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
RAW_DIR = PROJECT_ROOT / "raw"
WIKI_DIR = PROJECT_ROOT / "wiki"
TOOLS_DIR = PROJECT_ROOT / "tools"

# Default PDF path (can scan raw/ for multiple)
DEFAULT_PDF = RAW_DIR / "DWC_ether_qos_databook.pdf"
TREE_PATH = WIKI_DIR / "growing_knowledge_tree.json"

# ═══════════════════════════════════════════════════════════════════════════════
# PDF READER (raw/ layer — immutable, read-only)
# ═══════════════════════════════════════════════════════════════════════════════

def _resolve_pdf(pdf_name: str = None) -> Path:
    """
    Resolve PDF path. If pdf_name is given, look in raw/.
    Otherwise return default PDF.
    """
    if pdf_name:
        p = RAW_DIR / pdf_name
        if p.exists():
            return p
        # Try with .pdf extension
        if not pdf_name.endswith(".pdf"):
            p = RAW_DIR / (pdf_name + ".pdf")
            if p.exists():
                return p
        raise FileNotFoundError(f"PDF not found in raw/: {pdf_name}")
    
    if DEFAULT_PDF.exists():
        return DEFAULT_PDF
    
    # Auto-detect any PDF in raw/
    pdfs = list(RAW_DIR.glob("*.pdf"))
    if pdfs:
        return pdfs[0]
    
    raise FileNotFoundError(f"No PDF found in {RAW_DIR}")


def _read_pdf_raw(page_start: int, page_end: int, pdf_path: Path = None) -> str:
    """
    Read PDF pages from raw/ directory.
    This is the ONLY function that touches raw/. 
    Called ONLY when content is NOT in wiki cache.

    Args:
        page_start: First page to read (1-indexed)
        page_end: Last page to read (1-indexed)
        pdf_path: Specific PDF file (default: auto-resolve)
    
    Returns:
        Cleaned text content
    """
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


# ═══════════════════════════════════════════════════════════════════════════════
# RAW SCANNER — Detect new documents in raw/
# ═══════════════════════════════════════════════════════════════════════════════

def scan_raw_for_new_docs() -> List[Dict[str, Any]]:
    """
    Scan raw/ directory for documents not yet tracked in the knowledge tree.
    
    Returns:
        List of new documents found, each with:
        - filename, path, size, detected_type
    
    Usage in CLAUDE.md: Call this at start of each session to check for new docs.
    """
    tree = _load_tree()
    
    # Get list of already-tracked documents from tree metadata
    tracked = set()
    meta_doc = tree.get("metadata", {}).get("document", "")
    if meta_doc:
        tracked.add(meta_doc)
    
    # Also check metadata.documents list (for multi-doc support)
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
    """
    Add a new document from raw/ to the knowledge tree.
    Creates chapter entries from the document's table of contents.
    
    Args:
        filename: PDF filename in raw/ directory
        title: Human-readable title
        page_count: Total page count (auto-detected if None)
        description: Brief description
    
    Returns:
        Info about the added document
    """
    pdf_path = RAW_DIR / filename
    if not pdf_path.exists():
        raise FileNotFoundError(f"Document not found in raw/: {filename}")
    
    # Try to get page count from PDF
    if page_count is None:
        try:
            import PyPDF2
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                page_count = len(reader.pages)
        except:
            page_count = 0
    
    tree = _load_tree()
    
    # Add to documents list
    if "documents" not in tree["metadata"]:
        tree["metadata"]["documents"] = []
    
    doc_entry = {
        "filename": filename,
        "title": title,
        "page_count": page_count,
        "description": description,
        "added_at": datetime.now().isoformat(),
        "status": "indexed"  # indexed, partial, complete
    }
    tree["metadata"]["documents"].append(doc_entry)
    
    _save_tree(tree)
    print(f"[NEW DOC] Added '{title}' ({filename}, {page_count} pages) to knowledge tree")
    
    return doc_entry


# ═══════════════════════════════════════════════════════════════════════════════
# CORE: Lazy Content Loading (cache-first)
# ═══════════════════════════════════════════════════════════════════════════════

def get_or_load_content(chapter_id: str, page_start: int = None,
                        page_end: int = None, pdf_name: str = None) -> str:
    """
    Cache-first lazy loader. THE KEY FUNCTION of the knowledge engine.
    
    Flow:
        1. Check wiki cache → if hit, return cached content
        2. If miss → read from raw/ PDF → cache → return
    
    Args:
        chapter_id: e.g. "ch5", "ch7", "ch11"
        page_start: Override start page (default: from chapter def)
        page_end: Override end page (default: start + read_depth)
        pdf_name: Specific PDF in raw/ (default: auto-resolve)
    
    Returns:
        Text content (from cache or freshly read from raw/)
    
    Example:
        >>> content = get_or_load_content("ch5")       # Reads raw/ once
        >>> content = get_or_load_content("ch5")       # Returns from cache
    """
    tree = _load_tree()
    
    chapter = None
    for ch in tree["chapters"]:
        if ch["id"] == chapter_id:
            chapter = ch
            break
    
    if not chapter:
        return f"[ERROR] Chapter {chapter_id} not found."
    
    # Resolve PDF
    try:
        pdf_path = _resolve_pdf(pdf_name) if pdf_name else _resolve_pdf()
    except FileNotFoundError as e:
        return f"[ERROR] {e}"
    
    start = page_start or chapter["page_start"]
    end = page_end or min(chapter["page_end"], start + 10)
    cache_key = f"{chapter_id}_p{start}-{end}"
    
    # ═══════════════════════════════════════════════════════
    # STEP 1: Check wiki cache FIRST
    # ═══════════════════════════════════════════════════════
    cache = tree.get("cache", {}).get("entries", {})
    if cache_key in cache:
        print(f"  [CACHE HIT] {cache_key} ({len(cache[cache_key])} chars)")
        return cache[cache_key]
    
    # ═══════════════════════════════════════════════════════
    # STEP 2: CACHE MISS → Read from raw/
    # ═══════════════════════════════════════════════════════
    print(f"  [CACHE MISS] {cache_key} → reading raw/ PDF p.{start}-{end}...")
    content = _read_pdf_raw(start, end, pdf_path)
    
    if content.startswith("[ERROR]"):
        return content
    
    # Save to wiki cache
    if "cache" not in tree:
        tree["cache"] = {"entries": {}, "total_chars_cached": 0}
    if "entries" not in tree["cache"]:
        tree["cache"]["entries"] = {}
    
    tree["cache"]["entries"][cache_key] = content
    tree["cache"]["total_chars_cached"] = sum(
        len(v) for v in tree["cache"]["entries"].values()
    )
    
    # Update chapter stats
    chapter["reads_count"] = chapter.get("reads_count", 0) + 1
    chapter["last_read"] = datetime.now().isoformat()
    tree["metadata"]["total_reads_from_pdf"] = tree["metadata"].get("total_reads_from_pdf", 0) + 1
    
    # Status transition: seeded → explored
    if chapter["status"] == "seeded":
        chapter["status"] = "explored"
        print(f"  [GROWTH] {chapter_id}: seeded → explored")
    
    _save_tree(tree)
    print(f"  [SAVED] {cache_key}: {len(content)} chars cached to wiki/")
    return content


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

def search_knowledge(query: str, max_results: int = 5) -> list:
    """Search chapters, cached content, and knowledge leaves. No PDF read."""
    tree = _load_tree()
    query_lower = query.lower()
    query_terms = [t for t in re.split(r'[\s,，。]+', query_lower) if len(t) > 1]
    
    results = []
    for ch in tree["chapters"]:
        searchable = " ".join(filter(None, [
            ch.get("title", ""), ch.get("title_cn", ""),
            ch.get("description", ""),
        ])).lower()
        
        cached_content = ""
        for cache_key, content in tree.get("cache", {}).get("entries", {}).items():
            if cache_key.startswith(ch["id"] + "_"):
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
                for k in tree.get("cache", {}).get("entries", {}).keys()
            )
            results.append({
                "chapter": ch,
                "relevance": score,
                "has_cached_content": has_cache,
                "cache_keys": [
                    k for k in tree.get("cache", {}).get("entries", {}).keys()
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
    """Add a persistent knowledge leaf to wiki/leaves.entries."""
    tree = _load_tree()
    
    chapter = None
    for ch in tree["chapters"]:
        if ch["id"] == chapter_id:
            chapter = ch
            break
    if not chapter:
        raise ValueError(f"Chapter {chapter_id} not found")
    
    existing = tree.get("leaves", {}).get("entries", [])
    seq = sum(1 for leaf in existing if leaf["chapter_id"] == chapter_id) + 1
    leaf_id = f"leaf_{chapter_id}_{seq}"
    
    leaf = {
        "id": leaf_id,
        "chapter_id": chapter_id,
        "chapter_title": chapter.get("title_cn", chapter.get("title", "")),
        "topic": topic,
        "content": content,
        "source": source,
        "confidence": confidence,
        "created_at": datetime.now().isoformat(),
        "access_count": 0,
        "status": "active",
    }
    
    if "leaves" not in tree:
        tree["leaves"] = {"entries": []}
    if "entries" not in tree["leaves"]:
        tree["leaves"]["entries"] = []
    
    tree["leaves"]["entries"].append(leaf)
    tree["metadata"]["total_knowledge_leaves_created"] = len(tree["leaves"]["entries"])
    
    # Status transitions
    chapter_leaves = sum(1 for l in tree["leaves"]["entries"] if l["chapter_id"] == chapter_id)
    if chapter_leaves >= 3 and chapter["status"] == "explored":
        chapter["status"] = "growing"
        print(f"  [GROWTH] {chapter_id}: explored → growing ({chapter_leaves} leaves)")
    elif chapter_leaves >= 8 and chapter["status"] == "growing":
        chapter["status"] = "mature"
        print(f"  [GROWTH] {chapter_id}: growing → mature ({chapter_leaves} leaves)")
    
    _save_tree(tree)
    print(f"  [LEAF] {leaf_id}: {topic}")
    return leaf_id


def find_leaves(query: str = None, chapter_id: str = None,
                max_results: int = 10, include_archived: bool = False) -> list:
    """Find knowledge leaves by query or chapter."""
    tree = _load_tree()
    leaves = tree.get("leaves", {}).get("entries", [])

    if chapter_id:
        leaves = [l for l in leaves if l["chapter_id"] == chapter_id]

    if not include_archived:
        leaves = [l for l in leaves if l.get("status") != "archived"]

    if query:
        query_lower = query.lower()
        scored = []
        for leaf in leaves:
            text = f"{leaf['topic']} {leaf['content']}".lower()
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
    """Merge multiple leaves into one new leaf, archive sources.

    Args:
        source_ids: List of leaf IDs to merge
        new_topic: Topic for the merged leaf
        new_content: Content for the merged leaf
        source: Source attribution

    Returns:
        ID of the newly created merged leaf
    """
    tree = _load_tree()
    leaves = tree.get("leaves", {}).get("entries", [])

    sources = [l for l in leaves if l["id"] in source_ids]
    if len(sources) < 2:
        raise ValueError("Need at least 2 leaves to merge")

    chapter_id = sources[0]["chapter_id"]
    chapter = next((c for c in tree["chapters"] if c["id"] == chapter_id), None)

    seq = sum(1 for l in leaves if l["chapter_id"] == chapter_id) + 1
    new_id = f"leaf_{chapter_id}_{seq}"

    now = datetime.now().isoformat()
    new_leaf = {
        "id": new_id,
        "chapter_id": chapter_id,
        "chapter_title": chapter.get("title_cn", "") if chapter else "",
        "topic": new_topic,
        "content": new_content,
        "source": source,
        "confidence": "high",
        "created_at": now,
        "access_count": 0,
        "status": "active",
    }
    leaves.append(new_leaf)

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
    """Split one leaf into multiple new leaves, archive source.

    Args:
        source_id: Leaf ID to split
        parts: List of {topic, content} dicts for new leaves
        source: Source attribution

    Returns:
        List of new leaf IDs
    """
    tree = _load_tree()
    leaves = tree.get("leaves", {}).get("entries", [])

    src = next((l for l in leaves if l["id"] == source_id), None)
    if not src:
        raise ValueError(f"Leaf {source_id} not found")
    if len(parts) < 2:
        raise ValueError("Need at least 2 parts to split into")

    chapter_id = src["chapter_id"]
    chapter = next((c for c in tree["chapters"] if c["id"] == chapter_id), None)

    now = datetime.now().isoformat()
    new_ids = []

    for part in parts:
        seq = sum(1 for l in leaves if l["chapter_id"] == chapter_id) + 1
        new_id = f"leaf_{chapter_id}_{seq}"
        new_leaf = {
            "id": new_id,
            "chapter_id": chapter_id,
            "chapter_title": chapter.get("title_cn", "") if chapter else "",
            "topic": part["topic"],
            "content": part["content"],
            "source": source,
            "confidence": src.get("confidence", "high"),
            "created_at": now,
            "access_count": 0,
            "status": "active",
        }
        leaves.append(new_leaf)
        new_ids.append(new_id)

    src["status"] = "archived"
    src["archived_at"] = now
    src["archived_reason"] = "split"
    src["replaced_by"] = new_ids[0] if len(new_ids) == 1 else None

    _save_tree(tree)
    print(f"  [SPLIT] {source_id} → {len(new_ids)} leaves: {', '.join(new_ids)}")
    return new_ids


# ═══════════════════════════════════════════════════════════════════════════════
# WIKI SYNC — Export leaves to Markdown (llm-wiki standard)
# ═══════════════════════════════════════════════════════════════════════════════

def sync_leaves_to_markdown() -> int:
    """
    Export all knowledge leaves from wiki/growing_knowledge_tree.json
    to wiki/leaves/*.md files. Each leaf becomes a Markdown file with
    YAML frontmatter.
    
    Returns:
        Number of leaves exported
    
    File format (llm-wiki standard):
        ---
        id: leaf_ch5_1
        chapter_id: ch5
        chapter_title: PHY接口使用
        topic: RGMII接口特点
        confidence: high
        source: QA enrichment
        created_at: 2025-01-15T10:30:00
        access_count: 3
        ---
        
        RGMII在千兆模式下使用125MHz时钟...
    """
    tree = _load_tree()
    leaves_dir = WIKI_DIR / "leaves"
    leaves_dir.mkdir(exist_ok=True)
    
    leaves = tree.get("leaves", {}).get("entries", [])
    exported = 0

    for leaf in leaves:
        if leaf.get("status") == "archived":
            continue
        # Generate filename
        safe_topic = re.sub(r'[^\w\u4e00-\u9fff-]', '_', leaf["topic"])[:40]
        filename = f"{leaf['id']}_{safe_topic}.md"
        filepath = leaves_dir / filename
        
        # Content is already XML-formatted; just wrap with frontmatter
        md_content = f"""---
id: {leaf["id"]}
chapter_id: {leaf["chapter_id"]}
chapter_title: {leaf.get("chapter_title", "")}
topic: {leaf["topic"]}
confidence: {leaf.get("confidence", "medium")}
source: {leaf.get("source", "")}
created_at: {leaf.get("created_at", "")}
access_count: {leaf.get("access_count", 0)}
---

{leaf["content"]}
"""
        
        filepath.write_text(md_content, encoding="utf-8")
        exported += 1
    
    # Also create an index file
    index_path = leaves_dir / "index.md"
    index_lines = ["# Knowledge Leaves Index\n", "> Auto-generated from growing_knowledge_tree.json\n\n"]
    
    # Group by chapter
    by_chapter: Dict[str, List] = {}
    for leaf in leaves:
        cid = leaf["chapter_id"]
        if cid not in by_chapter:
            by_chapter[cid] = []
        by_chapter[cid].append(leaf)
    
    for ch_id in sorted(by_chapter.keys()):
        ch_leaves = by_chapter[ch_id]
        ch = next((c for c in tree["chapters"] if c["id"] == ch_id), None)
        ch_title = ch.get("title_cn", ch_id) if ch else ch_id
        
        index_lines.append(f"## {ch_title} ({ch_id})\n")
        for leaf in ch_leaves:
            safe_topic = re.sub(r'[^\w\u4e00-\u9fff-]', '_', leaf["topic"])[:40]
            filename = f"{leaf['id']}_{safe_topic}.md"
            index_lines.append(f"- [{leaf['topic']}]({filename}) — {leaf['confidence']}")
        index_lines.append("")
    
    index_path.write_text("\n".join(index_lines), encoding="utf-8")
    
    print(f"  [SYNC] {exported} leaves exported to wiki/leaves/")
    return exported


def wiki_sync() -> Dict[str, int]:
    """
    Full wiki synchronization (llm-wiki standard command).
    
    Performs:
    1. Sync leaves to Markdown
    2. Update wiki/index.md from current tree state
    3. Update wiki/overview.md stats
    
    Returns:
        Dict with counts of synced items
    """
    print("\n" + "="*50)
    print("WIKI SYNC")
    print("="*50)
    
    tree = _load_tree()
    
    # 1. Sync leaves
    leaves_exported = sync_leaves_to_markdown()
    
    # 2. Update overview.md
    _update_overview_md(tree)
    
    # 3. Update index.md
    _update_index_md(tree)
    
    print("="*50)
    print(f"  Leaves exported: {leaves_exported}")
    print(f"  Wiki files updated: overview.md, index.md")
    
    return {
        "leaves_exported": leaves_exported,
        "status": "ok"
    }


def _update_overview_md(tree: dict) -> None:
    """Regenerate overview.md with current stats."""
    m = tree["metadata"]
    s = {"seeded": 0, "explored": 0, "growing": 0, "mature": 0}
    for ch in tree["chapters"]:
        s[ch.get("status", "seeded")] += 1
    
    all_leaves = tree.get("leaves", {}).get("entries", [])
    leaves_count = len([l for l in all_leaves if l.get("status") != "archived"])
    cache_count = len(tree.get("cache", {}).get("entries", {}))
    
    overview_path = WIKI_DIR / "overview.md"
    
    # Build explored chapters table
    explored_table = []
    for ch in tree["chapters"]:
        if ch["status"] != "seeded":
            ch_leaves = sum(1 for l in all_leaves
                          if l["chapter_id"] == ch["id"] and l.get("status") != "archived")
            explored_table.append(
                f"| {ch['id']} | {ch.get('title_cn', ch['title'])} | "
                f"{ch['status']} | {ch.get('reads_count', 0)} | {ch_leaves} |"
            )
    
    if not explored_table:
        explored_table = ["| *(none yet)* | | | | |"]
    
    content = f"""# DWC_ether_qos Knowledge Overview

> **Document**: DWC_ether_qos Databook v{m.get('version', '?')} ({m.get('date', '')}) — {m.get('total_pages', 0)} pages  
> **Source**: `raw/DWC_ether_qos_databook.pdf`  
> **Knowledge Tree**: `wiki/growing_knowledge_tree.json`  
> **Last Synced**: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## What is DWC_ether_qos?

DWC_ether_qos is Synopsys's DesignWare Cores Ethernet Quality-of-Service controller, compliant with IEEE 802.3-2015. It supports 10/100/1000 Mbps data rates with extensive QoS, TSN, and offload features.

## Exploration Status

### Summary
| Metric | Value |
|--------|-------|
| Total Chapters | {len(tree['chapters'])} |
| Seeded | {s['seeded']} |
| Explored | {s['explored']} |
| Growing | {s['growing']} |
| Mature | {s['mature']} |
| PDF Reads | {m.get('total_reads_from_pdf', 0)} |
| Knowledge Leaves | {leaves_count} |
| Cache Entries | {cache_count} |
| Cache Entries | {cache_count} |

### Explored Chapters
| Chapter | Title | Status | Reads | Leaves |
|---------|-------|--------|-------|--------|
{chr(10).join(explored_table)}

## How to Grow This Wiki

1. Search knowledge tree: `results = search_knowledge("RGMII")`
2. Read PDF on demand: `content = get_or_load_content("ch5", 167, 171)`
3. Agent synthesizes answer from context
4. New insights are saved as knowledge leaves via `add_knowledge_leaf()`
4. Run `python tools/knowledge_growth.py sync` to export to Markdown
5. Run `python tools/knowledge_growth.py stats` to check growth

## Quick Reference

| Topic | Chapter | Page |
|-------|---------|------|
| PHY Interfaces | ch5 | 167 |
| 1588/PTP | ch7 | 243 |
| TSO | ch9 | 350 |
| EST/TSN | ch8 | 307 |
| Frame Preemption | ch8 | 319 |
| Descriptors | ch11 | 420 |
| DMA | ch2 | 64 |
| MAC | ch2 | 118 |
| Init Sequence | ch20 | 1301 |
"""
    
    overview_path.write_text(content, encoding="utf-8")
    print("  [SYNC] wiki/overview.md updated")


def _update_index_md(tree: dict) -> None:
    """Regenerate index.md with current chapter statuses."""
    
    # Build chapter table
    chapter_rows = []
    all_leaves = tree.get("leaves", {}).get("entries", [])
    for ch in tree["chapters"]:
        ch_leaves = sum(1 for l in all_leaves
                       if l["chapter_id"] == ch["id"] and l.get("status") != "archived")
        ch_cache = sum(1 for k in tree.get("cache", {}).get("entries", {}).keys()
                      if k.startswith(ch["id"] + "_"))
        
        status_icon = {"seeded": "○", "explored": "◐", "growing": "◑", "mature": "●"}.get(ch.get("status", "seeded"), "○")
        
        chapter_rows.append(
            f"| {ch['id']} | {ch.get('title_cn', ch['title'])} | "
            f"p.{ch['page_start']}-{ch['page_end']} | "
            f"{status_icon} {ch.get('status', 'seeded')} | {ch_leaves} | {ch_cache} |"
        )
    
    content = f"""# Wiki Index

> Auto-generated from `growing_knowledge_tree.json`.  
> Run `python tools/knowledge_growth.py sync` to regenerate.

## Overview
- [Overview](overview.md) — Knowledge growth statistics and status

## Chapters ({len(tree['chapters'])})

| ID | Chapter | Pages | Status | Leaves | Cache |
|----|---------|-------|--------|--------|-------|
{chr(10).join(chapter_rows)}

## Knowledge Leaves
- [Leaves Index](leaves/index.md) — All knowledge leaves

## Tools
- [knowledge_growth.py](../tools/knowledge_growth.py) — Lazy-loading knowledge engine
"""
    
    index_path = WIKI_DIR / "index.md"
    index_path.write_text(content, encoding="utf-8")
    print("  [SYNC] wiki/index.md updated")


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
    
    cache_entries = len(tree.get("cache", {}).get("entries", {}))
    cache_chars = tree.get("cache", {}).get("total_chars_cached", 0)
    leaves = tree.get("leaves", {}).get("entries", [])
    
    # Check raw/ for documents
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
        "total_leaves": len(leaves),
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
        print("DWC Ethernet QoS Knowledge Growth Engine v2.1")
        print("")
        print("Commands:")
        print("  stats                          Show growth statistics")
        print("  sync                           Sync wiki/ (export leaves to Markdown)")
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
    
    elif cmd == "sync":
        wiki_sync()
    
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
            print(f"[{leaf['id']}] {leaf['topic']} ({leaf['chapter_title']})")
            print(f"  {leaf['content'][:100]}...")
    
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
