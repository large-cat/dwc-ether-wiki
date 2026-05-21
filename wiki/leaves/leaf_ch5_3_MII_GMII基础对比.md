---
id: leaf_ch5_3
chapter_id: ch5
chapter_title: PHY接口使用
topic: MII/GMII基础对比
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:20:20.395574
access_count: 0
---

# MII/GMII基础对比

> Chapter: [[PHY接口使用]]  
> Source: `QA enrichment`  
> Confidence: `high`

MII（Media Independent Interface）：4位数据通道，16个信号，支持10/100Mbps，使用25MHz时钟。GMII（Gigabit MII）：8位数据通道，24个信号，支持10/100/1000Mbps，千兆模式使用125MHz时钟。RGMII是GMII的精简版（12引脚），RMII是MII的精简版（7引脚，50MHz参考时钟）。所有接口都通过Station Management Agent（MDIO接口，支持Clause 22和Clause 45）管理PHY寄存器。

## Connections

- [[ch5]] — Parent chapter
