# Operation Log

> Append-only log of all knowledge tree operations.

## 2025-01-15

### Setup
- **Action**: Initialize knowledge tree from DWC_ether_qos_databook.pdf
- **Source**: `raw/DWC_ether_qos_databook.pdf` (v5.10a, 1418 pages)
- **Result**: 23 chapters seeded (status: "seeded")
- **Tree version**: 2.0
- **Principle**: Lazy-loading — content read ON-DEMAND only

### Schema
- Created `growing_knowledge_tree.json` with:
  - `chapters[]`: 23 chapters with metadata (title, page_start, page_end, status)
  - `cache.entries{}`: Empty (content filled on-demand)
  - `leaves.entries[]`: Empty (insights from QA sessions)
  - `qa_log.entries[]`: Empty
- Status states: `seeded` → `explored` → `growing` → `mature`

### Structure
- `raw/` — PDF source document (immutable)
- `wiki/` — Knowledge tree (LLM-managed)
- `site/` — React frontend
- `tools/` — Python knowledge growth engine
- `CLAUDE.md` — Claude Code instructions
