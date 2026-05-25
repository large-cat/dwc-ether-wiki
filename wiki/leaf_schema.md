# Knowledge Leaf XML/HTML Schema v3.0

> 叶子内容从 Markdown 语法迁移到 XML/HTML 语义标签，实现结构化存储 + 富语义渲染。

## 设计原则

1. **语义优先**：每个标签表达内容类型，而非视觉样式
2. **前端友好**：标签名直接映射到 React 组件，解析简单
3. **人可读**：XML 结构清晰，不依赖缩进语义

## 标签总览

### 基础文本

| 标签 | 属性 | 说明 |
|------|------|------|
| `<p>` | — | 普通段落 |
| `<h>` | `level`: 2\|3\|4 | 标题 |
| `<code>` | `lang?` | 代码块或行内代码 |
| `<kbd>` | — | 按键/寄存器名，等宽高亮 |
| `<em>` | — | 强调 |
| `<strong>` | — | 强强调 |

### 列表

| 标签 | 属性 | 说明 |
|------|------|------|
| `<ul>` | — | 无序列表 |
| `<ol>` | — | 有序列表 |
| `<li>` | — | 列表项 |

### 表格

| 标签 | 属性 | 说明 |
|------|------|------|
| `<table>` | — | 表格容器 |
| `<thead>` | — | 表头 |
| `<tbody>` | — | 表体 |
| `<tr>` | — | 行 |
| `<th>` | — | 表头单元格 |
| `<td>` | — | 数据单元格 |

### 语义提示（Callout / 表情标签）

| 标签 | 颜色语义 | 使用场景 |
|------|----------|----------|
| `<info>` | 蓝色 | 补充信息、背景知识 |
| `<warning>` | 琥珀色 | 注意事项、潜在风险 |
| `<tip>` | 绿色 | 技巧、最佳实践 |
| `<important>` | 红色 | 关键限制、必须遵守 |
| `<question>` | 紫色 | 常见问题、自问自答 |

提示标签内可包含任意块级/行内内容。

### 硬件专用标签

| 标签 | 属性 | 说明 |
|------|------|------|
| `<register>` | `name`, `addr?`, `offset?` | 寄存器描述块 |
| `<field>` | `name`, `bits`, `access` (R/W/RW/RC/WO) | 寄存器字段 |
| `<signal>` | `name`, `direction?` (in/out/inout) | 信号线描述 |
| `<bitfield>` | `width` | 位域可视化容器 |

### 引用与连接

| 标签 | 属性 | 说明 |
|------|------|------|
| `<ref>` | `target` (chapter/leaf/pdf page) | 内部交叉引用 |
| `<quote>` | `source?` | 引文 |

## 完整示例

```xml
<h level="2">RGMII 接口特点</h>

<p>RGMII（Reduced Gigabit Media Independent Interface）将 GMII 的 24 个引脚精简到 12 个引脚。</p>

<info>
  <p>使用 <kbd>txd[3:0]</kbd> / <kbd>rxd[3:0]</kbd> 4 位数据通道，在时钟<em>上升沿和下降沿</em>传输数据（DDR）。</p>
</info>

<table>
  <thead>
    <tr><th>速率</th><th>时钟频率</th><th>时钟边沿</th></tr>
  </thead>
  <tbody>
    <tr><td>10 Mbps</td><td>2.5 MHz</td><td>双沿</td></tr>
    <tr><td>100 Mbps</td><td>25 MHz</td><td>双沿</td></tr>
    <tr><td>1000 Mbps</td><td>125 MHz</td><td>双沿</td></tr>
  </tbody>
</table>

<warning>
  <p>不支持 10Mbps 半双工模式，因为 CRS 和 COL 信号未被 RGMII 承载。</p>
</warning>

<register name="MAC_Configuration" offset="0x0000">
  <field name="RE" bits="0" access="RW">接收使能</field>
  <field name="TE" bits="1" access="RW">发送使能</field>
</register>

<ref target="ch5">返回第 5 章 PHY 接口</ref>
```

## 前端映射

每个 XML 标签对应一个 React 组件：

```
<p>       → <p className="...">
<h>       → <h2/h3/h4> (由 level 决定)
<ul/li   → <ul>/<li>
table     → Shadcn Table
info      → 蓝色左侧边框 + info 图标
warning   → 琥珀色左侧边框 + alert-triangle 图标
tip       → 绿色左侧边框 + lightbulb 图标
important → 红色左侧边框 + alert-circle 图标
question  → 紫色左侧边框 + help-circle 图标
register  → 寄存器卡片（等宽字体 + 地址高亮）
field     → 位域行（bits 标签 + access badge）
kbd       → <code> 带背景色
ref       → 内部链接 <a>
```

## 约束规则

1. 根级必须是块级标签（`<p>`, `<h>`, `<ul>`, `<table>`, `<info>` 等），不允许裸文本
2. 行内标签（`<kbd>`, `<em>`, `<strong>`, `<code>`）只能出现在块级标签内部
3. 提示标签（`<info>`, `<warning>` 等）内部必须至少包含一个块级子元素
4. 所有属性值必须加引号，标签必须正确闭合
5. 保留字符（`<`, `>`, `&`）在文本节点中应转义，或用 `<code>` 包裹
