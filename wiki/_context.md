# DWC Ethernet QoS Knowledge Wiki

This wiki is the **LLM-managed knowledge layer** for the DWC_ether_qos databook (v5.10a, 1418 pages). It follows the [llm-wiki three-layer architecture](https://github.com/Pratiyush/llm-wiki):

```
raw/     → Immutable source documents (PDF databook)
wiki/    → LLM-managed knowledge (this directory)
site/    → Built frontend (React SPA)
tools/   → Knowledge growth engine (Python)
```

## Lazy-Loading Principle

**NEVER bulk-extract the PDF.** Content is read from `raw/DWC_ether_qos_databook.pdf` ON-DEMAND only when a question requires knowledge not already in the tree. Everything read is cached as `.md` files in `wiki/cache/` (indexed by `cache.json`) and persisted as knowledge leaves in `wiki/leaves/*.txt` (metadata in `growing_knowledge_tree.json`).

## Directory Layout

| File / Directory | Purpose |
|------------------|---------|
| `_context.md` | This file — describes the wiki structure |
| `growing_knowledge_tree.json` | Core knowledge tree — metadata index only (chapters + leaf metadata with `content_path`) |
| `cache.json` | Cache index — maps cache keys to `cache/*.md` file paths |
| `cache/` | PDF cache content — one `.md` file per cache entry |
| `leaves/` | Knowledge leaf content — one `.txt` file per leaf (XML/HTML semantic tags) |
| `leaf_schema.md` | Knowledge leaf XML/HTML tag reference |

## When to Walk This Wiki

- User asks about DWC_ether_qos features, configuration, or programming
- User asks about specific Ethernet standards (IEEE 802.3, 1588, TSN)
- User asks about PHY interfaces (RGMII, SGMII, RMII, etc.)
- User asks about DMA, descriptors, packet filtering, or TCP/IP offloading

## When to Skip

- User asks about unrelated topics — the wiki only covers DWC_ether_qos
- User asks for real-time info (prices, news) — the wiki is based on a 2017 databook

## Hard Rules

1. **raw/ is immutable.** Never modify the PDF. If you need different content, read different pages.
2. **wiki/ is append-only for leaves.** Never delete a knowledge leaf. Mark as deprecated if needed.
3. **Cache is forever.** Once content is read from PDF into cache.entries, it stays.
4. **Cross-reference everything.** Use chapter IDs (ch5, ch7) and section IDs (5.3, 7.1) when creating leaves.
