# DWC Ethernet QoS 可生长知识问答系统

基于 [llm-wiki](https://github.com/Pratiyush/llm-wiki) 三层架构的 DWC_ether_qos 知识库。

**在线演示**: https://large-cat.github.io/dwc-ether-wiki/

---

## 架构（三层分离）

```
dwc-ether-qos-qa/
├── raw/                              ← Layer 1: 原始文档（不可变）
│   └── DWC_ether_qos_databook.pdf    ← 8.2MB, 1418页, v5.10a
│
├── wiki/                             ← Layer 2: LLM管理的知识（读写）
│   ├── _context.md                   ← wiki目录上下文
│   ├── index.md                      ← 章节索引
│   ├── overview.md                   ← 知识总览
│   ├── log.md                        ← 操作日志
│   ├── growing_knowledge_tree.json   ← ★ 核心知识树（懒加载）
│   └── leaves/                       ← 知识叶子导出
│
├── site/                             ← Layer 3: 前端展示平台
│   ├── src/                          ← React SPA 源码
│   ├── dist/                         ← 构建产物
│   └── package.json                  ← 前端依赖
│
├── tools/                            ← Layer 1+2: 知识引擎
│   ├── knowledge_growth.py           ← ★ PDF读取 + 知识树管理
│   └── README.md
│
├── CLAUDE.md                         ← Claude Code 指令
└── README.md                         ← 本文件
```

### 核心设计：懒加载（Lazy-Loading）

Agent 自主驱动问答，只使用 Layer 1（PDF读取）和 Layer 2（知识树）：

```
用户提问
    ↓
search_knowledge()      → 搜索 wiki/（标题/缓存/叶子）
    ↓
get_or_load_content()   → 先查缓存 → 缓存不命中才读 raw/ PDF
    ↓
Agent 综合上下文作答
    ↓
add_knowledge_leaf()    → 新洞察保存到 wiki/leaves
```

**边界规则**：Layer 3（site/）只在更新前端渲染规则时变更，Agent 问答不触碰。

**铁律**：`raw/` 只读不可写，`wiki/` 追加不可删，缓存永不过期。

---

## 目录状态

| 层 | 目录 | 说明 |
|----|------|------|
| Layer 1 | raw/ | PDF源文档（不可变） |
| Layer 2 | wiki/ | 23个章节已播种，懒加载 |
| Layer 3 | site/ | React前端源码 + 构建产物 |
| Layer 1+2 | tools/ | PDF读取 + 知识树管理 |

所有 23 个章节初始状态为 `seeded`（已播种），等待首次提问触发PDF读取。

---

## 快速开始

### 前端（Layer 3）

```bash
cd site
npm install
npm run build   # 构建到 site/dist/
```

### Claude Code 集成（Layer 1+2，知识生长）

```bash
# 在 Claude Code 中
/load CLAUDE.md

# 启动引擎
exec(open("tools/knowledge_growth.py").read())

# 扫描 raw/ 是否有新文档
scan_raw_for_new_docs()

# 查看状态
print_stats()

# Agent 自主搜索和读取
results = search_knowledge("RGMII接口")
content = get_or_load_content("ch5", 167, 171)

# 保存新洞察
add_knowledge_leaf("ch5", "RGMII时钟频率", "125MHz for Gigabit...")
```

### CLI 工具

```bash
# 扫描 raw/
python tools/knowledge_growth.py scan

# 搜索知识树
python tools/knowledge_growth.py search "RGMII"

# 读取PDF（懒加载）
python tools/knowledge_growth.py read ch5

# 统计
python tools/knowledge_growth.py stats
```

---

## 状态机

```
seeded（已播种）    → 只有目录和基本描述
    ↓ 首次读PDF
explored（已探索）  → 已缓存PDF内容
    ↓ 积累3个知识叶子
growing（生长中）   → 知识开始密集积累
    ↓ 积累8个知识叶子
mature（成熟）      → 知识充分覆盖
```

---

## 许可证

MIT

---

*Knowledge tree grows one question at a time.*
