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
│   ├── index.md                      ← Catalog of all chapters
│   ├── overview.md                   ← Living synthesis of explored knowledge
│   ├── log.md                        ← Append-only operation log
│   ├── growing_knowledge_tree.json   ← ★ Core knowledge tree (machine format)
│   └── leaves/                       ← Markdown exports of leaves
│
├── site/                             ← Layer 3: Frontend platform (React SPA)
│   ├── src/                          ← Source code
│   ├── dist/                         ← Build output
│   ├── package.json                  ← Frontend dependencies
│   └── vite.config.ts                ← Build config
│
├── tools/                            ← Layer 1+2: Knowledge engine
│   ├── knowledge_growth.py           ← ★ PDF reader + knowledge tree manager
│   └── README.md                     ← Tool usage guide
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
- `tools/knowledge_growth.py` spans Layer 1+2. `tools/convert_leaves_to_markdown.py` belongs to Layer 3 (render helper). |

---

## Session Startup Checklist

At the **beginning of every session**, run these steps:

```python
exec(open("tools/knowledge_growth.py").read())

# 1. Scan for new documents in raw/
new_docs = scan_raw_for_new_docs()
if new_docs:
    print(f"New documents found: {[d['filename'] for d in new_docs]}")
    # Ask user if they want to index them
    for doc in new_docs:
        # add_document(doc["filename"], doc["filename"].replace(".pdf",""))
        pass

# 2. Show current state
print_stats()
```

---

## Core Workflow (Agent-Driven Q&A)

Agent handles Q&A by **actively reading** Layer 1 & 2. The engine does NOT auto-synthesize answers.

```
User Question
    ↓
[1. scan_raw_for_new_docs()]    → Check if raw/ has new PDFs
    ↓
[2. search_knowledge()]          → Search wiki/ (titles, cache, leaves) — NO PDF READ
    ↓
[3. find_leaves()]               → Check for existing knowledge leaves
    ↓
◆ Have relevant leaves?
    ├─ YES → Agent synthesizes answer from leaves (fastest, no PDF read)
    └─ NO  → Continue...
    ↓
[4. Check wiki cache]            → Is content cached from previous reads?
    ↓
◆ Cache hit?
    ├─ YES → Agent reads cached content, synthesizes answer
    └─ NO  → Continue...
    ↓
[5. get_or_load_content()]       → ★ Read raw/ PDF ON-DEMAND, cache to wiki/
    ↓
[6. Agent synthesizes answer]    → Agent combines context, responds to user
    ↓
◆ Learned something new?
    ├─ YES → add_knowledge_leaf() → Persist insight to wiki/leaves.entries
    └─ NO  → Skip
```

---

## API Reference

### scan_raw_for_new_docs() → List[Dict]

Check `raw/` directory for PDFs not yet tracked in the knowledge tree. Call this at **every session start**.

```python
new_docs = scan_raw_for_new_docs()
# Returns: [{"filename": "xxx.pdf", "size_human": "8.2 MB", ...}, ...]
```

### add_document(filename, title, page_count=None, description="") → Dict

Add a new document from `raw/` to the knowledge tree.

```python
doc = add_document("DWC_ether_qos_databook.pdf", 
                   "DWC Ethernet QoS Databook",
                   description="Synopsys DesignWare Ethernet QoS Controller v5.10a")
```

### get_or_load_content(chapter_id, page_start=None, page_end=None) → str

Cache-first lazy loader. THE key function.

```python
# First call — reads from raw/, caches to wiki/
content = get_or_load_content("ch5", 167, 171)  # [CACHE MISS] → reads PDF

# Second call — returns from wiki cache instantly
content = get_or_load_content("ch5", 167, 171)  # [CACHE HIT] → no PDF read
```

### add_knowledge_leaf(chapter_id, topic, content, source="QA enrichment", confidence="high") → str

Persist an insight to the knowledge tree.

```python
leaf_id = add_knowledge_leaf("ch5", "RGMII时钟频率",
    "RGMII在千兆模式下使用125MHz参考时钟，百兆模式25MHz，十兆模式2.5MHz。",
    confidence="high")
# → "leaf_ch5_1"
```

### search_knowledge(query, max_results=5) → List[Dict]

Search wiki/ without reading PDF.

```python
results = search_knowledge("RGMII 时钟")
for r in results:
    print(f"{r['chapter']['id']}: {r['chapter']['title_cn']} (relevance: {r['relevance']})")
```

### find_leaves(query=None, chapter_id=None, max_results=10) → List[Dict]

Search knowledge leaves.

```python
# Find all leaves about RGMII
leaves = find_leaves("RGMII")

# Find leaves in chapter 5
leaves = find_leaves(chapter_id="ch5")
```

### get_stats() / print_stats()

Show growth statistics.

```python
print_stats()
# KNOWLEDGE TREE GROWTH STATISTICS
# ==================================================
# Document:       DWC_ether_qos_databook.pdf
# Tree Version:   2.0
# Chapters:       23
#   Seeded:       23
#   Explored:     0
#   Growing:      0
#   Mature:       0
# PDF Reads:      0
# Leaves:         0
# Cache Entries:  0
# Cache Size:     0 chars
# raw/ Documents: 1
#   - DWC_ether_qos_databook.pdf (8.2 MB)
# Last Updated:   2025-01-15T10:00:00
```

---

## Hard Rules

### Layer Boundaries

1. **raw/ is sacred.** Never modify, move, or delete files in `raw/`. They are the immutable source of truth.
2. **wiki/ is append-only for leaves.** Never delete a knowledge leaf. If it's wrong, add a corrected one with higher confidence.
3. **Cache is forever.** Once content is read from `raw/` into `wiki/cache.entries`, it stays. Don't delete cache entries.
4. **Only read PDF on cache miss.** If `get_or_load_content()` returns cache hit, do not read the PDF again.
5. **Agent Q&A only uses Layer 1+2.** Do not touch `site/` during Q&A sessions. Layer 3 is for frontend rendering only.
6. **中文回答，英文术语.** Keep technical terms in English (RGMII, TSO, Descriptor), answer body in Chinese.

---

## Chapter Quick Reference

| ID | Title | Page | Key Topics |
|----|-------|------|-----------|
| ch1 | Product Overview | 23 | Features, configurations, deliverables |
| ch2 | Architecture | 41 | CSR, DMA, MAC, MTL, Interrupts |
| ch3 | VLAN Processing | 151 | Double VLAN, tag insertion/replacement |
| ch4 | Buffers & Memories | 159 | FIFO, TCP/IP header buffer, SPRAM |
| ch5 | PHY Interfaces | 167 | **RGMII, SGMII, RMII**, MII, GMII |
| ch6 | Packet Filtering | 213 | Address filter, VLAN filter, L3/L4 filter |
| ch7 | 1588 Timestamp | 243 | **PTP, one-step, two-step**, PPS, media clock |
| ch8 | Multi-Channel/Queues | 281 | **TSN, EST, frame preemption**, scheduling |
| ch9 | TCP/IP Offloading | 339 | **TSO, checksum offload**, UFO, ARP |
| ch10 | Power Management | 373 | EEE, Magic Packet, Wake-on-LAN |
| ch11 | Descriptors | 419 | Tx/Rx descriptors, **OWN bit**, contexts |
| ch12 | Registers | 479 | MAC, MTL, DMA registers (reference) |
| ch20 | Programming | 1301 | **Init sequence**, Tx/Rx programming |

---

## Example Session

```python
# === SESSION START ===
exec(open("tools/knowledge_growth.py").read())

# 1. Scan for new docs
new_docs = scan_raw_for_new_docs()
# → [] (no new docs, all tracked)

# 2. Check state
print_stats()
# → 23 seeded, 0 explored, 0 reads, 0 leaves

# 3. Agent searches for relevant chapters
results = search_knowledge("RGMII接口")
# → Found ch5 (NOT CACHED)

# 4. Agent reads PDF content on demand
content = get_or_load_content("ch5", 167, 171)
# → [CACHE MISS] ch5_p167-171 → reads raw/ PDF → caches → explored

# 5. Agent synthesizes answer from content
# "RGMII使用4位数据通道，在时钟上升沿和下降沿传输数据..."

# 6. Save insight as leaf
add_knowledge_leaf("ch5", "RGMII接口特点",
    "RGMII（精简千兆MII）使用4位数据通道，支持在时钟上升沿和下降沿传输数据（DDR）。"
    "将GMII的24个引脚减少到12个。支持10/100/1000Mbps。",
    confidence="high")
# → [LEAF] leaf_ch5_1: RGMII接口特点
# → [GROWTH] ch5: explored → growing (3 leaves)

# 7. Second question about same topic — agent finds cached content
leaves = find_leaves("RGMII时钟")
# → [CACHE HIT] ch5_p167-171 → no PDF read!
# → returns leaf_ch5_1

# 8. Check final state
print_stats()
# → 1 explored, 1 growing, 3 leaves, 1 cache entry
```

---

*Knowledge tree grows one question at a time. Every read from raw/ is an investment in wiki/.*
