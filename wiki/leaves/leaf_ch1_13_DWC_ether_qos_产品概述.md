---
id: leaf_ch1_13
chapter_id: ch1
chapter_title: 产品概述
topic: DWC_ether_qos 产品概述
confidence: high
source: compilation
created_at: 2026-05-25T06:10:20.870999
access_count: 0
---

<h level="2">产品概述</h>

<p>DWC_ether_qos 是 Synopsys DesignWare Cores 以太网 QoS 控制器，符合 <strong>IEEE 802.3-2015</strong> 规范。适用于 AV bridges、AV nodes、switches、NICs、data center bridges/nodes 等场景。通过 <strong>AHB</strong> 或 <strong>AXI Master</strong> 接口连接所有 DMA 通道，DMA Arbiter 负责仲裁所有通道的收发路径。每个通道有独立的 CSR 管理收发功能、描述符处理和中断处理。</p>

<h level="3">标准合规性</h>

<table>
  <thead>
    <tr><th>标准</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>IEEE 802.3-2015</td><td>Ethernet MAC, GMII, MII, TBI</td></tr>
    <tr><td>IEEE 1588-2008</td><td>Precision networked clock synchronization</td></tr>
    <tr><td>IEEE 802.1AS-2011 / 802.1-Qav-2009</td><td>AV traffic</td></tr>
    <tr><td>IEEE 802.3az-2010</td><td>Energy Efficient Ethernet (EEE)</td></tr>
    <tr><td>IEEE 802.1Qbv-2015 / 802.1Qbu-2016</td><td>TSN</td></tr>
    <tr><td>IEEE 802.1Qaz-2011 / 802.1Qbb-2011</td><td>Data Center Bridging (DCB)</td></tr>
    <tr><td>RGMII v2.6, RMII v1.2, SGMII v1.8, SMII v2.1, RevMII</td><td>PHY 接口规范</td></tr>
  </tbody>
</table>

<h level="3">MAC 特性</h>

<h level="4">核心能力</h>

<p>MAC 支持 <strong>10/100/1000 Mbps</strong>，PHY 接口包括 GMII/MII(默认)、TBI、RTBI、RGMII、SGMII、SMII、RMII、RevMII。全双工支持 <strong>IEEE 802.3x Pause</strong> 和 <strong>Priority Flow Control</strong>。半双工支持 <strong>CSMA/CD</strong> 和 backpressure flow control。支持 <strong>IEEE 1588 PTP</strong> 时间戳（64-bit），Tx 方向支持 <strong>one-step</strong> 和 <strong>two-step timestamping</strong>。支持 <strong>PPS</strong> 输出控制和 media clock generation/recovery。支持 <strong>MDIO Clause 22/45</strong> 主接口。数据宽度可选 32/64/128-bit。</p>

<h level="4">Tx 特性</h>

<ul>
  <li>Preamble 和 SFD 自动插入</li>
  <li>每包独立的 32-bit 状态</li>
  <li>可编程包长（Standard/Jumbo up to 16KB）</li>
  <li>可编程 Inter Packet Gap（40-96 bit times，步进8）</li>
  <li>自动 CRC 和 pad 生成（可按包控制）</li>
  <li>Source Address 插入/替换</li>
  <li>VLAN 插入/替换/删除（最多2个 tag）</li>
  <li>支持 reduced preamble size（全双工）</li>
  <li>Frame Preemption</li>
</ul>

<h level="4">Rx 特性</h>

<ul>
  <li>自动 Pad/CRC stripping；可选禁用 CRC checking</li>
  <li>Preamble/SFD 删除；112-bit 或 128-bit 接收状态</li>
  <li>可编程 watchdog timeout</li>
  <li>灵活地址过滤：最多31个 perfect DA filters（带 byte mask），最多96个 additional perfect DA filters，最多31个 SA comparison filters，32/64/128/256-bit Hash filter（multicast/unicast），promiscuous mode</li>
  <li>VLAN tag-based 过滤（perfect/hash-based，支持 outer/inner tag）</li>
  <li>L3/L4-based 过滤（TCP/UDP over IPv4/IPv6）</li>
  <li>远程唤醒包和 AMD magic packet 检测</li>
  <li>Rx Frame Preemption</li>
</ul>

<h level="3">MTL 特性</h>

<p>MTL (Transaction Layer) 作为应用和 MAC 之间的桥梁，支持 32/64/128-bit 数据宽度。</p>

<table>
  <thead>
    <tr><th>项目</th><th>规格</th></tr>
  </thead>
  <tbody>
    <tr><td>Tx FIFO</td><td>256B / 512B / 1KB / 2KB / 4KB / 8KB / 16KB / 32KB / 64KB / 128KB</td></tr>
    <tr><td>Rx FIFO</td><td>256B / 512B / 1KB / 2KB / 4KB / 8KB / 16KB / 32KB / 64KB / 128KB / 256KB</td></tr>
    <tr><td>Queue</td><td>最多 8 个 Tx queue + 8 个 Rx queue，共享 common memory</td></tr>
    <tr><td>Tx 模式</td><td>Store-and-Forward 或 Threshold (cut-through)</td></tr>
    <tr><td>调度算法</td><td>WRR, DWRR, WFQ, Strict Priority, CBS (AVB), EST (TSN), TBS (TSN)</td></tr>
  </tbody>
</table>

<h level="3">DMA 特性</h>

<ul>
  <li>32/64/128-bit 数据传输，最多 <strong>8 Tx + 8 Rx channel</strong></li>
  <li>每个 MTL Tx queue 对应独立 DMA Tx channel；Rx 可单/多 channel</li>
  <li><strong>Dual-buffer (ring) descriptor</strong> 架构，每个 descriptor 最多传输 32KB</li>
  <li>支持字节对齐寻址，支持 <strong>TSO</strong> (TCP Segmentation Offload) 和 <strong>UFO</strong> (UDP Fragmentation Offload)</li>
  <li>支持 header (L3/L4) 和 payload 分存到不同 buffer</li>
  <li>支持时间敏感的条件包获取（基于 Slot Time 或 IEEE 1588 time）</li>
  <li>Tx/Rx engine 仲裁：<strong>Round-robin</strong> 或 <strong>Fixed-priority</strong></li>
</ul>

<h level="3">AMBA 接口</h>

<table>
  <thead>
    <tr><th>接口</th><th>数据宽度</th><th>关键特性</th></tr>
  </thead>
  <tbody>
    <tr><td>AHB Master</td><td>32/64/128-bit</td><td>Split/Retry/Error 响应，1K boundary burst splitting</td></tr>
    <tr><td>AHB Slave (CSR)</td><td>32/64/128-bit</td><td>仅支持 &lt;=32-bit 访问，所有 burst types</td></tr>
    <tr><td>AXI Master</td><td>AXI3/AXI4</td><td>32/40/48-bit 地址，最多32个 outstanding R/W，posted writes</td></tr>
    <tr><td>AXI Slave (CSR)</td><td>AXI3/AXI4-Lite</td><td>32-bit 地址，Narrow burst，FIXED/INCR</td></tr>
    <tr><td>APB Slave</td><td>32-bit</td><td>APB3 (pready), APB4 (pstrb, pprot)</td></tr>
  </tbody>
</table>

<h level="3">AV / DCB / TSN</h>

<table>
  <thead>
    <tr><th>特性</th><th>规格</th></tr>
  </thead>
  <tbody>
    <tr><td>AV (Audio Video)</td><td>100/1000 Mbps，最多8 Rx / 7 Tx queue，IEEE 802.1-Qav CBS，Slot Interval 1-4096 us</td></tr>
    <tr><td>DCB</td><td>100/1000 Mbps，最多8 Tx/Rx queue，WRR/DWRR/WFQ/SP 调度，PFC</td></tr>
    <tr><td>TSN</td><td>IEEE 802.1Qbv (EST), IEEE 802.1Qbu/802.3br (Frame Preemption)</td></tr>
  </tbody>
</table>

<h level="3">汽车安全特性</h>

<ul>
  <li>ECC 保护 memories</li>
  <li>On-chip data path parity 保护</li>
  <li>FSM parity 和 timeout 保护</li>
  <li>Application/CSR interface timeout 保护</li>
  <li>SECDED ECC（Single Error Correction, Double Error Detection）</li>
  <li>错误注入测试（ECC/Parity/FSM/Interface timeout）</li>
</ul>

<info>
  <p>SECDED ECC 仅适用于 <strong>DWC ASP Ethernet QOS (C118-0)</strong> 产品</p>
</info>

<h level="3">架构配置</h>

<p>DWC_ether_qos 可通过 coreConsultant 配置为以下架构：</p>

<ul>
  <li><strong>EQOS-AHB</strong>（默认）— DMA + AHB</li>
  <li><strong>EQOS-AXI</strong> — DMA + AXI</li>
  <li><strong>EQOS-DMA</strong> — DMA + native 接口，无 AHB/AXI</li>
  <li><strong>EQOS-MTL</strong> — 仅 FIFO 层 + native FIFO 接口，无 DMA</li>
  <li><strong>EQOS-CORE</strong> — 仅 native FIFO 接口，无 DMA/MTL/AHB/AXI</li>
</ul>

<p>速率配置可选：10/100/1000 Mbps、仅 10/100、或仅 1000 Mbps。</p>

<h level="3">交付物</h>

<p>交付包文件 <code>dw_iip_DWC_ether_qos_5.10a.run</code>，需 Synopsys coreConsultant 安装/配置。包含：</p>

<ul>
  <li>Verilog RTL 源码</li>
  <li>Design Compiler 和 Synplify Pro 综合脚本</li>
  <li>验证测试平台（EQOS-AHB/AXI 用 DW AMBA VIP，EQOS-DMA/MTL/CORE 独立 TB）</li>
  <li>支持 VCS/ModelSim/NC-Verilog 仿真器</li>
  <li>IP-XACT 组件 (XML)</li>
  <li>GTECH library 支持 gate-level DUT</li>
  <li>软件驱动需联系 Synopsys Support</li>
</ul>
