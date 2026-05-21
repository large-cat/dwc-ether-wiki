# Knowledge Tools

Python tools for the DWC Ethernet QoS lazy-loading knowledge tree.

## File Structure

| File | Purpose |
|------|---------|
| `knowledge_growth.py` | Main engine — search, read PDF, add leaves, answer questions |
| `__init__.py` | Package init |

## Quick Start

```bash
# From project root
cd /path/to/dwc-ether-qos-qa

# Show stats
python tools/knowledge_growth.py stats

# Search the knowledge tree
python tools/knowledge_growth.py search "RGMII"

# Ask a question (full workflow)
python tools/knowledge_growth.py ask "RGMII有什么特点"

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
    answer_question,
    add_knowledge_leaf,
    search_knowledge,
    get_or_load_content,
    find_leaves,
    get_stats,
    print_stats,
    scan_raw_for_new_docs,
)

# Answer a question
result = answer_question("RGMII有什么特点？")
print(result["context"][:500])

# Check stats
print_stats()

# Scan raw/ for new documents
new_docs = scan_raw_for_new_docs()
print(new_docs)
```

## Architecture

```
tools/knowledge_growth.py
    ├── _read_pdf_raw()          → Low-level PDF reader (PyPDF2)
    ├── _load_tree() / _save_tree()  → JSON persistence
    ├── search_knowledge()       → Search titles + cache + leaves
    ├── get_or_load_content()    → Cache-first lazy loader ★
    ├── add_knowledge_leaf()     → Persist insights
    ├── answer_question()        → Full QA workflow
    ├── find_leaves()            → Search knowledge leaves
    ├── get_stats() / print_stats()  → Growth analytics
    └── scan_raw_for_new_docs()  → Detect new docs in raw/
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
