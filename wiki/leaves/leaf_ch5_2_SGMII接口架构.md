---
id: leaf_ch5_2
chapter_id: ch5
chapter_title: PHY接口使用
topic: SGMII接口架构
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:20:20.393428
access_count: 0
---

# SGMII接口架构

> Chapter: [[PHY接口使用]]  
> Source: `QA enrichment`  
> Confidence: `high`

SGMII（Serial Gigabit Media Independent Interface）使用串行差分信号对传输数据，通过PCS（Physical Coding Sublayer）层与MAC连接。架构为：MAC ←→ PCS ←→ SerDes ←→ External PHY。数据在SerDes中串行化为1.25Gbps差分信号。支持自协商（Auto-negotiation）。相比并行接口，SGMII引脚数更少、信号完整性更好、适合长PCB走线和SFP/SFP+模块应用。

## Connections

- [[ch5]] — Parent chapter
