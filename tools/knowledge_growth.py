#!/usr/bin/env python3
"""
DWC Ethernet QoS — Lazy-Loading Knowledge Growth Engine

CLI: python tools/knowledge_growth.py --help
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
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

# Ensure tools/ is importable when run directly
sys.path.insert(0, str(PROJECT_ROOT))

# PDF engine with structure-aware extraction
from tools.pdf_cache import resolve_pdf, read_pdf_pages


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
# CACHE (cache.json — chapter/page-range oriented)
# ═══════════════════════════════════════════════════════════════════════════════

def _load_cache_index() -> dict:
    """Load cache index. Format: {chapter_id: [{start, end, file}, ...]}."""
    if not CACHE_INDEX_PATH.exists():
        return {"version": "3.0", "chapters": {}}
    try:
        with open(CACHE_INDEX_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"version": "3.0", "chapters": {}}


def _save_cache_index(data: dict) -> None:
    """Save cache index to wiki/cache.json."""
    with open(CACHE_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find_cached_range(chapter_id: str, start: int, end: int) -> Optional[dict]:
    """Find a cached range that fully covers [start, end]."""
    data = _load_cache_index()
    for r in data.get("chapters", {}).get(chapter_id, []):
        if r["start"] <= start and r["end"] >= end:
            return r
    return None


def _load_cache_file(rel_path: str) -> str:
    """Load content from a cache file."""
    filepath = WIKI_DIR / rel_path
    if not filepath.exists():
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _save_cache(chapter_id: str, start: int, end: int, content: str) -> dict:
    """Save content to cache file and return range metadata."""
    CACHE_DIR.mkdir(exist_ok=True)
    rel_path = f"cache/{chapter_id}_p{start}-{end}.txt"
    filepath = WIKI_DIR / rel_path
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return {"start": start, "end": end, "file": rel_path}


# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENT — Add new PDF and build chapter map from bookmarks
# ═══════════════════════════════════════════════════════════════════════════════

def add_document(filename: str) -> Dict[str, Any]:
    """Add a new PDF from raw/ and build chapter map from bookmarks."""
    pdf_path = RAW_DIR / filename
    if not pdf_path.exists():
        raise FileNotFoundError(f"Document not found in raw/: {filename}")

    import fitz
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    toc = doc.get_toc()
    doc.close()

    # Build chapters from level-1 TOC entries with valid page numbers
    chapters = []
    toc_entries = [(level, title, page) for level, title, page in toc if level == 1 and page > 0]

    for i, (level, title, page) in enumerate(toc_entries):
        page_start = page  # fitz page numbers are 0-based in TOC
        if i + 1 < len(toc_entries):
            page_end = toc_entries[i + 1][2] - 1
        else:
            page_end = page_count - 1

        chapters.append({
            "id": f"ch{i+1}",
            "number": i + 1,
            "title": title,
            "title_cn": "",
            "page_start": page_start,
            "page_end": page_end,
            "status": "seeded",
            "reads_count": 0,
            "description": "",
        })

    tree = _load_tree()
    tree["metadata"]["document"] = filename
    tree["metadata"]["total_pages"] = page_count
    tree["chapters"] = chapters
    if "leaves" not in tree:
        tree["leaves"] = []
    _save_tree(tree)
    print(f"[NEW DOC] Added '{filename}' ({page_count} pages, {len(chapters)} chapters)")
    return {"filename": filename, "page_count": page_count, "chapters": len(chapters)}


# ═══════════════════════════════════════════════════════════════════════════════
# CORE: Lazy Content Loading
# ═══════════════════════════════════════════════════════════════════════════════

def ensure_cached(chapter_id: str, page_start: int = None,
                  page_end: int = None, pdf_name: str = None) -> str:
    """Read PDF pages into cache if not already cached. Returns cache file path.
    Does NOT return content — callers must read the cache file themselves."""
    tree = _load_tree()

    chapter = None
    for ch in tree["chapters"]:
        if ch["id"] == chapter_id:
            chapter = ch
            break

    if not chapter:
        print(f"[ERROR] Chapter {chapter_id} not found.")
        return ""

    try:
        pdf_path = resolve_pdf(pdf_name) if pdf_name else resolve_pdf()
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        return ""

    req_start = page_start or chapter["page_start"]
    req_end = page_end or chapter["page_end"]
    req_start = max(req_start, chapter["page_start"])
    req_end = min(req_end, chapter["page_end"])

    if req_start > req_end:
        print(f"[ERROR] Invalid page range: {req_start}-{req_end}")
        return ""

    # Check cache — if already cached, nothing to do
    cached = _find_cached_range(chapter_id, req_start, req_end)
    if cached:
        print(f"[CACHE] Already cached: {cached['file']}")
        return cached["file"]

    # Read from PDF and save cache
    pages_read = req_end - req_start + 1
    print(f"[PDF READ] {chapter_id} p.{req_start}-{req_end}...")
    content = read_pdf_pages(req_start, req_end, pdf_path, images_dir=None)
    if content.startswith("[ERROR]"):
        print(content)
        return ""

    new_range = _save_cache(chapter_id, req_start, req_end, content)
    data = _load_cache_index()
    if "chapters" not in data:
        data["chapters"] = {}
    if chapter_id not in data["chapters"]:
        data["chapters"][chapter_id] = []
    data["chapters"][chapter_id].append(new_range)
    _save_cache_index(data)

    # Update chapter stats
    chapter["reads_count"] = chapter.get("reads_count", 0) + pages_read
    chapter["last_read"] = datetime.now().isoformat()
    tree["metadata"]["total_reads_from_pdf"] = tree["metadata"].get("total_reads_from_pdf", 0) + pages_read
    _save_tree(tree)
    print(f"[CACHED] {new_range['file']}")

    return new_range["file"]


# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE LEAVES
# ═══════════════════════════════════════════════════════════════════════════════

def add_leaf(chapter_id: str, topic: str, content: str,
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
    _save_tree(tree)
    return leaf_id


def delete_leaf(leaf_id: str) -> bool:
    """Delete a leaf and its content file."""
    tree = _load_tree()
    leaves = tree.get("leaves", [])

    for i, leaf in enumerate(leaves):
        if leaf["id"] == leaf_id:
            filepath = WIKI_DIR / leaf.get("content_path", "")
            if filepath.exists():
                filepath.unlink()
            leaves.pop(i)
            _save_tree(tree)
            return True
    return False


def update_leaf(leaf_id: str, topic: str = None, content: str = None,
                confidence: str = None) -> bool:
    """Update leaf properties. Only provided fields are changed."""
    tree = _load_tree()
    leaves = tree.get("leaves", [])

    for leaf in leaves:
        if leaf["id"] == leaf_id:
            if topic is not None:
                leaf["topic"] = topic
            if content is not None:
                content_path = leaf.get("content_path", "")
                if content_path:
                    _save_leaf_content(content_path, content)
                else:
                    new_path = _leaf_content_path(leaf_id, topic or leaf["topic"])
                    _save_leaf_content(new_path, content)
                    leaf["content_path"] = new_path
            if confidence is not None:
                leaf["confidence"] = confidence
            leaf["updated_at"] = datetime.now().isoformat()
            _save_tree(tree)
            return True
    return False


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
    cache_ranges = 0
    cache_chars = 0
    for ranges in cache_data.get("chapters", {}).values():
        cache_ranges += len(ranges)
        for r in ranges:
            content = _load_cache_file(r["file"])
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
        "cache_ranges": cache_ranges,
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
    print(f"Cache Ranges:   {stats['cache_ranges']}")
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
    if len(sys.argv) < 2:
        print("DWC Ethernet QoS Knowledge Growth Engine v3.0")
        print("")
        print("Usage: python tools/knowledge_growth.py <command> [args]")
        print("")
        print("Commands:")
        print("  stats                          Show growth statistics")
        print("  read <chapter_id> [pages]      Read PDF (cache first)")
        print("  add-leaf <ch_id> <topic> <content>  Add a leaf")
        print("  delete-leaf <leaf_id>          Delete a leaf")
        print("  update-leaf <leaf_id> <topic> <content>  Update a leaf")
        print("  add-doc <filename>             Add PDF and build chapter map")
        print("")
        print("Examples:")
        print('  python tools/knowledge_growth.py stats')
        print('  python tools/knowledge_growth.py read ch5')
        print('  python tools/knowledge_growth.py add-doc DWC_ether_qos_databook.pdf')
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "stats":
        print_stats()

    elif cmd == "read":
        ch_id = sys.argv[2] if len(sys.argv) > 2 else "ch5"
        pages = int(sys.argv[3]) if len(sys.argv) > 3 else 5

        tree = _load_tree()
        ch = next((c for c in tree["chapters"] if c["id"] == ch_id), None)
        if not ch:
            print(f"Chapter {ch_id} not found")
            sys.exit(1)

        cache_file = get_or_load_content(ch_id, ch["page_start"],
                                          min(ch["page_start"] + pages - 1, ch["page_end"]))
        if cache_file:
            content = _load_cache_file(cache_file)
            print(content[:2000])

    elif cmd == "add-leaf":
        if len(sys.argv) < 5:
            print("Usage: add-leaf <chapter_id> <topic> <content>")
            sys.exit(1)
        leaf_id = add_leaf(sys.argv[2], sys.argv[3], sys.argv[4])
        print(f"Created: {leaf_id}")

    elif cmd == "delete-leaf":
        if len(sys.argv) < 3:
            print("Usage: delete-leaf <leaf_id>")
            sys.exit(1)
        ok = delete_leaf(sys.argv[2])
        print("Deleted." if ok else "Not found.")

    elif cmd == "update-leaf":
        if len(sys.argv) < 5:
            print("Usage: update-leaf <leaf_id> <topic> <content>")
            sys.exit(1)
        ok = update_leaf(sys.argv[2], topic=sys.argv[3], content=sys.argv[4])
        print("Updated." if ok else "Not found.")

    elif cmd == "add-doc":
        if len(sys.argv) < 3:
            print("Usage: add-doc <filename>")
            sys.exit(1)
        doc = add_document(sys.argv[2])
        print(f"Added: {doc}")

    else:
        print(f"Unknown command: {cmd}")
