---
id: leaf_ch8_1
chapter_id: ch8
chapter_title: 多通道和队列
topic: EST时间感知调度器
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:21:16.454488
access_count: 0
---

# EST时间感知调度器

> Chapter: [[多通道和队列]]  
> Source: `QA enrichment`  
> Confidence: `high`

增强调度流量（EST，IEEE 802.1Qbv）通过时间门控控制队列传输。门控控制列表（GCL）定义每个队列何时可以传输。周期时间可编程（工业应用通常1-10ms）。每个队列有一个时间门，根据GCL在Open（可传输）和Closed（不可传输）之间切换。双缓冲设计：Administrative GCL（软件配置）和Operational GCL（硬件活跃），允许无缝切换。关键操作：Set-Gate-State、Set-And-Hold-MAC、Set-And-Release-MAC。

## Connections

- [[ch8]] — Parent chapter
