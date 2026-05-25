# DWC_ether_qos Knowledge Overview

> **Document**: DWC_ether_qos Databook v5.10a (December 2017) — 1418 pages  
> **Source**: `raw/DWC_ether_qos_databook.pdf`  
> **Knowledge Tree**: `wiki/growing_knowledge_tree.json`  
> **Last Synced**: 2026-05-25 15:05

## What is DWC_ether_qos?

DWC_ether_qos is Synopsys's DesignWare Cores Ethernet Quality-of-Service controller, compliant with IEEE 802.3-2015. It supports 10/100/1000 Mbps data rates with extensive QoS, TSN, and offload features.

## Exploration Status

### Summary
| Metric | Value |
|--------|-------|
| Total Chapters | 23 |
| Seeded | 19 |
| Explored | 1 |
| Growing | 1 |
| Mature | 2 |
| PDF Reads | 20 |
| Knowledge Leaves | 49 |
| Cache Entries | 17 |

### Explored Chapters
| Chapter | Title | Status | Reads | Leaves |
|---------|-------|--------|-------|--------|
| ch1 | 产品概述 | mature | 6 | 1 |
| ch2 | 架构 | mature | 12 | 29 |
| ch5 | PHY接口使用 | growing | 1 | 3 |
| ch7 | IEEE 1588时间戳支持 | explored | 1 | 2 |

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
