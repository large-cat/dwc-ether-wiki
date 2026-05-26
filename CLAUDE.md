# DWC Ethernet QoS Knowledge Base — Claude Code Guide

> **Version**: 4.0
> **Architecture**: Three-layer separation — raw (PDF source) / wiki (knowledge tree) / site (frontend platform)
> **Core Principle**: `raw/` is immutable. Only read from it on cache miss. Everything learned goes to `wiki/`. Agent Q&A only uses Layer 1 & 2.

---

## Directory Structure

```
.
├── raw/                              ← Layer 1: Immutable source documents
│   └── DWC_ether_qos_databook.pdf    ← NEVER modify this file
│
├── wiki/                             ← Layer 2: LLM-managed knowledge (read/write)
│   ├── _context.md                   ← This wiki's purpose & rules
│   ├── growing_knowledge_tree.json   ← ★ Core knowledge tree — metadata index (chapters + leaf metadata)
│   ├── cache.json                    ← Cache index (key → path)
│   ├── cache/                        ← PDF cache content (.txt files)
│   ├── leaves/                       ← Knowledge leaf content (.txt files, XML/HTML semantic tags)
│   └── leaf_schema.md                ← Leaf XML/HTML tag reference
│
├── site/                             ← Layer 3: Frontend platform (React SPA)
│   ├── src/                          ← Source code
│   ├── dist/                         ← Build output
│   ├── public/                       ← Copied wiki assets at build time
│   ├── scripts/                      ← Build helper scripts
│   ├── package.json                  ← Frontend dependencies
│   └── vite.config.ts                ← Build config
│
├── tools/                            ← Layer 1+2: Knowledge engine
│   ├── knowledge_growth.py           ← ★ PDF reader + knowledge tree manager
│
├── CLAUDE.md                         ← This file
└── README.md                         ← Project overview
```

### The Three Layers

| Layer | Contents | Mutability | Who Changes It |
|-------|----------|------------|----------------|
| **Layer 1** `raw/` | Source PDFs | **Immutable** | Never |
| **Layer 2** `wiki/` | Knowledge tree, cache, leaves, logs | **LLM-managed** | Agent (via `tools/knowledge_growth.py`) |
| **Layer 3** `site/` | React SPA, build output | **Build output** | Frontend dev / build process |

**Boundary rules:**
- Agent Q&A only touches **Layer 1** (PDF read on cache miss) and **Layer 2** (search/cache/leaves).
- **Layer 3** is only modified when updating frontend rendering rules or rebuilding the UI.
- `tools/knowledge_growth.py` spans Layer 1+2. Leaf content is saved directly to `wiki/leaves/*.txt`; cache content to `wiki/cache/*.txt`.

---

## Session Startup

```bash
python tools/knowledge_growth.py --help
```

---

## Core Workflow (Agent-Driven Q&A)

Agent handles Q&A by **actively reading** Layer 1 & 2. The engine does NOT auto-synthesize answers.

```
User Question
    ↓
Search wiki/                      → titles, cache, leaves (no PDF read)
    ↓
Check knowledge leaves            → have relevant leaves?
    ├─ YES → synthesize answer from leaves (fastest)
    └─ NO  → continue...
    ↓
Check wiki cache                  → cached from previous reads?
    ├─ YES → read cached content, synthesize answer
    └─ NO  → continue...
    ↓
Read raw/ PDF on-demand           → cache to wiki/, then answer
    ↓
Learned something new?            → persist insight to wiki/leaves
```

---

## Hard Rules

### Layer Boundaries

1. **raw/ is sacred.** Never modify, move, or delete files in `raw/`. They are the immutable source of truth.
2. **wiki/ is append-only for leaves.** Never delete a knowledge leaf. If it's wrong, add a corrected one with higher confidence.
3. **Cache is forever.** Once content is read from `raw/` into `wiki/cache/*.txt` (indexed by `cache.json`), it stays. Don't delete cache entries.
4. **Only read PDF on cache miss.** `ensure_cached()` produces cache files in `wiki/cache/*.txt`; do not read the PDF again if already cached.
5. **Agent Q&A only uses Layer 1+2.** Do not touch `site/` during Q&A sessions. Layer 3 is for frontend rendering only.
6. **中文回答，英文术语.** Keep technical terms in English (RGMII, TSO, Descriptor), answer body in Chinese.

*Knowledge tree grows one question at a time. Every read from raw/ is an investment in wiki/.*
