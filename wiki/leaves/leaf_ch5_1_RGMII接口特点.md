---
id: leaf_ch5_1
chapter_id: ch5
chapter_title: PHY接口使用
topic: RGMII接口特点
confidence: high
source: QA enrichment
created_at: 2026-05-21T11:20:20.391225
access_count: 0
---

<h level="2">RGMII接口特点</h>

<info>
  <p>Chapter: [[PHY接口使用]]</p>
  <p>Source: <code>QA enrichment</code></p>
  <p>Confidence: <code>high</code></p>
</info>

<p>RGMII（Reduced Gigabit Media Independent Interface）将GMII的24个引脚精简到12个引脚。使用4位数据通道（txd[3:0]/rxd[3:0]），在时钟上升沿和下降沿传输数据（DDR）。支持10Mbps、100Mbps、1000Mbps三种速率。支持RGMII-ID变体，在时钟线上添加1.5-2.0ns内部延迟以简化PCB布线。信号包括：txd[3:0]、rxd[3:0]、tx_ctl（tx_en+tx_err复用）、rx_ctl（rx_dv+rx_err复用）、tx_clk、rx_clk。</p>

<h level="3">Connections</h>

<ul>
  <li>[[ch5]] — Parent chapter</li>
</ul>
