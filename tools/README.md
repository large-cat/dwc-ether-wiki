# Knowledge Tools

Python tools for the DWC Ethernet QoS lazy-loading knowledge tree.

## File Structure

| File | Purpose |
|------|---------|
| `knowledge_growth.py` | Layer 1+2 engine — PDF reader, knowledge tree manager |
| `__init__.py` | Package init |

## Quick Start

```bash
# From project root
cd /path/to/dwc-ether-qos-qa

# Show stats
python tools/knowledge_growth.py stats

# Search the knowledge tree
python tools/knowledge_growth.py search "RGMII"

# Read PDF for a chapter (lazy — only reads if not cached)
python tools/knowledge_growth.py read ch5

# List knowledge leaves
python tools/knowledge_growth.py leaves

# Add a knowledge leaf manually
python tools/knowledge_growth.py add-leaf ch5 "RGMII时钟频率" "125MHz for Gigabit..."
```

## Importing in Python

```python
import sys
sys.path.insert(0, ".")
from tools.knowledge_growth import (
    add_knowledge_leaf,
    search_knowledge,
    get_or_load_content,
    find_leaves,
    get_stats,
    print_stats,
    scan_raw_for_new_docs,
)

# Search knowledge tree
results = search_knowledge("RGMII")
print(results)

# Read PDF content on demand
content = get_or_load_content("ch5", 167, 171)
print(content[:500])

# Check stats
print_stats()

# Scan raw/ for new documents
new_docs = scan_raw_for_new_docs()
print(new_docs)
```

## Architecture

```
tools/knowledge_growth.py
    ├── _read_pdf_raw()          → Low-level PDF reader (Layer 1)
    ├── _load_tree() / _save_tree()  → JSON persistence (Layer 2)
    ├── search_knowledge()       → Search titles + cache + leaves (Layer 2)
    ├── get_or_load_content()    → Cache-first lazy loader ★ (Layer 1→2)
    ├── add_knowledge_leaf()     → Persist insights (Layer 2)
    ├── find_leaves()            → Search knowledge leaves (Layer 2)
    ├── get_stats() / print_stats()  → Growth analytics (Layer 2)
    └── scan_raw_for_new_docs()  → Detect new docs in raw/ (Layer 1)
```

## Data Flow

```
raw/DWC_ether_qos_databook.pdf
    ↓ (read only on cache miss)
tools/knowledge_growth.py → get_or_load_content()
    ↓ (cache hit → return; cache miss → read PDF → cache → return)
    ↓ (insights extracted)
wiki/growing_knowledge_tree.json
    ├── cache.entries{}        ← Cached PDF content
    └── leaves.entries[]       ← Knowledge leaves
```
