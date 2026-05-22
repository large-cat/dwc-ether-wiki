---
id: leaf_ch7_2
chapter_id: ch7
chapter_title: IEEE 1588时间戳支持
topic: IEEE 1588系统时间格式
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:21:16.452141
access_count: 0
---

<h level="2">IEEE 1588系统时间格式</h>

<info>
  <p>Chapter: [[IEEE 1588时间戳支持]]</p>
  <p>Source: <code>QA enrichment</code></p>
  <p>Confidence: <code>high</code></p>
</info>

<p>系统时间以64位值维护：高32位为秒（seconds），低32位为纳秒（nanoseconds，范围0-999,999,999）。时间源可选择：内部（Internal，从应用时钟派生，可编程sub-second增量值）或外部（External，通过外部时间戳接口提供）。支持时间初始化、偏移量更新（加/减用于同步）、以及随时读取。sub-second增量值决定时间戳分辨率。</p>

<h level="3">Connections</h>

<ul>
  <li>[[ch7]] — Parent chapter</li>
</ul>
