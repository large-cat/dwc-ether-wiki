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
│   ├── cache/                        ← PDF cache content (.md files)
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
- `tools/knowledge_growth.py` spans Layer 1+2. Leaf content is saved directly to `wiki/leaves/*.txt`; cache content to `wiki/cache/*.md`.

---

## Session Startup

常用命令速查：

```bash
# 知识树状态
python tools/knowledge_growth.py stats

# 读取 PDF 章节（先查缓存，命中则直接返回；否则从 PDF 读取并自动缓存）
python tools/knowledge_growth.py read ch1        # 不传 pages 读完整章节
python tools/knowledge_growth.py read ch5 10     # 读前 10 页
python tools/knowledge_growth.py cache ch2       # 只缓存不输出内容

# 管理知识叶子
python tools/knowledge_growth.py add-leaf ch1 "topic" "content"
python tools/knowledge_growth.py update-leaf leaf_ch1_1 "topic" "content"
python tools/knowledge_growth.py delete-leaf leaf_ch1_1
```

更多命令：`python tools/knowledge_growth.py --help`

---

## Core Workflow (Agent-Driven Q&A)

Agent handles Q&A by **actively reading** Layer 1 & 2. The engine does NOT auto-synthesize answers.

```
User Question
    ↓
Search wiki/                      → grep leaves/*.txt, cache/*.md (no PDF read)
    ↓
Check knowledge leaves            → have relevant leaves?
    ├─ YES → synthesize answer from leaves (fastest)
    └─ NO  → continue...
    ↓
Check wiki cache                  → cached from previous reads?
    ├─ YES → read cached content, synthesize answer
    └─ NO  → continue...
    ↓
Read raw/ PDF via tools           → python tools/knowledge_growth.py read chN
    │                                 (auto-caches to wiki/cache/)
    ↓
Learned something new?            → python tools/knowledge_growth.py add-leaf ...
```

---

## Hard Rules

### PDF 读取入口

所有 PDF 读取通过 `tools/knowledge_growth.py` 进行：
- `python tools/knowledge_growth.py read chN` — 读取章节 N，先查 `wiki/cache/`，命中则返回缓存内容；未命中则从 `raw/` PDF 提取并自动缓存到 `wiki/cache/*.md`
- `python tools/knowledge_growth.py cache chN` — 同上，只缓存不输出内容
- 不传 `[pages]` 时读完整章节；传 `[pages]` 时读指定页数
- `ensure_cached()` 是底层缓存 API，命令行入口是 `read` 和 `cache`

### Layer 约定

1. **`raw/` 是只读源层。** 内容通过 `read`/`cache` 命令提取到 `wiki/cache/`，缓存持久保存。
2. **`wiki/` 是可读写知识层。** 叶子通过 `add-leaf` / `update-leaf` / `delete-leaf` 管理；缓存通过 `read` / `cache` 自动管理。
3. **`site/` 不参与 Q&A。** 只在前端构建时读写，Agent 只操作 `wiki/` 和 `raw/`。
4. **中文回答，英文术语.** Keep technical terms in English (RGMII, TSO, Descriptor), answer body in Chinese.

*Knowledge tree grows one question at a time. Every read from raw/ is an investment in wiki/.*
