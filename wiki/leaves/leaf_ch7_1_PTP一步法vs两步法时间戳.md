---
id: leaf_ch7_1
chapter_id: ch7
chapter_title: IEEE 1588时间戳支持
topic: PTP一步法vs两步法时间戳
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:21:16.449691
access_count: 0
---

<h level="2">PTP一步法vs两步法时间戳</h>

<info>
  <p>Chapter: [[IEEE 1588时间戳支持]]</p>
  <p>Source: <code>QA enrichment</code></p>
  <p>Confidence: <code>high</code></p>
</info>

<p>一步法（One-Step）：在发送PTP报文的同时将时间戳直接嵌入Correction Field中，不需要Follow_Up报文。两步法（Two-Step）：发送Sync报文后，通过独立的Follow_Up报文传递精确时间戳信息。DWC_ether_qos硬件支持两种模式，通过寄存器配置选择。一步法减少报文数量但硬件更复杂；两步法更灵活，适合软件时间戳校正。</p>

<h level="3">Connections</h>

<ul>
  <li>[[ch7]] — Parent chapter</li>
</ul>
