---
id: leaf_ch1_6
chapter_id: ch1
chapter_title: 产品概述
topic: MTL 特性
confidence: high
source: QA enrichment
created_at: 2026-05-21T10:48:59.933413
access_count: 0
---

# MTL 特性

> Chapter: [[产品概述]]  
> Source: `QA enrichment`  
> Confidence: `high`

MTL (Transaction Layer) 作为应用和 MAC 之间的桥梁，支持 32/64/128-bit 数据宽度。Tx FIFO 大小可选：256B, 512B, 1KB, 2KB, 4KB, 8KB, 16KB, 32KB, 64KB, 128KB。Rx FIFO 大小可选：256B, 512B, 1KB, 2KB, 4KB, 8KB, 16KB, 32KB, 64KB, 128KB, 256KB。支持最多8个 Tx queue 和8个 Rx queue，共享 common memory。Tx 支持 Store-and-Forward 或 Threshold (cut-through) 模式。调度算法：WRR, DWRR, WFQ, Strict Priority, CBS (AVB), EST (TSN), TBS (TSN)。

## Connections

- [[ch1]] — Parent chapter
