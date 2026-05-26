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
│   ├── growing_knowledge_tree.json   ← ★ 核心知识树 — 元数据索引（章节 + 叶子metadata）
│   ├── cache.json                    ← 缓存索引（key → path）
│   ├── cache/                        ← PDF缓存内容（.md文件）
│   ├── leaves/                       ← 知识叶子内容（.txt文件，XML/HTML语义标签）
│   └── leaf_schema.md                ← 叶子标签规范
│
├── site/                             ← Layer 3: 前端展示平台
│   ├── src/                          ← React SPA 源码
│   ├── dist/                         ← 构建产物
│   ├── public/                       ← 构建时复制的wiki资源
│   ├── scripts/                      ← 构建辅助脚本
│   ├── package.json                  ← 前端依赖
│   └── vite.config.ts                ← 构建配置
│
├── tools/                            ← Layer 1+2: 知识引擎
│   ├── knowledge_growth.py           ← ★ PDF读取 + 知识树管理
│
├── CLAUDE.md                         ← Claude Code 指令
└── README.md                         ← 本文件
```

### 核心设计：懒加载（Lazy-Loading）

Agent 自主驱动问答，只使用 Layer 1（PDF读取）和 Layer 2（知识树）：

```
用户提问
    ↓
Agent 读取 wiki/        → 直接读 growing_knowledge_tree.json + leaves/*.txt
    ↓
需要读原文？            → 调用 ensure_cached() 产生 wiki/cache/*.md
    ↓
Agent 读取 cache 作答
    ↓
add_leaf()              → 新洞察保存到 wiki/leaves/*.txt，metadata写入tree
```

**边界规则**：Layer 3（site/）只在更新前端渲染规则时变更，Agent 问答不触碰。

**铁律**：`raw/` 只读不可写；`wiki/` 叶子可增删改；缓存永不过期。

---

## 目录状态

| 层 | 目录 | 说明 |
|----|------|------|
| Layer 1 | raw/ | PDF源文档（不可变） |
| Layer 2 | wiki/ | 23个章节已播种，懒加载 |
| Layer 3 | site/ | React前端源码 + 构建产物 |
| Layer 1+2 | tools/ | PDF读取 + 知识树管理 |

所有 23 个章节初始状态为 `seeded`（已播种），等待首次提问触发PDF读取。

**内容存储分离**：`growing_knowledge_tree.json` 只保存结构化元数据（章节信息 + 叶子metadata + `content_path` 引用），实际内容保存在 `wiki/leaves/*.txt`（知识叶子）和 `wiki/cache/*.md`（PDF缓存）中。前端通过动态 fetch 按需加载内容。

---

## 快速开始

### 前端（Layer 3）

```bash
cd site
npm install
npm run copy-assets   # 复制 wiki/ 资源到 public/
npm run build         # 构建到 site/dist/
```

### 知识引擎（Layer 1+2）

```bash
python tools/knowledge_growth.py --help
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
