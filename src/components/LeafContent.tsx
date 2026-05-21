import { useState } from 'react'
import { ChevronDown, Sprout, Quote, Info, Layers, Table2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LeafContentProps {
  leaf: {
    id: string
    topic: string
    content: string
    confidence: string
    source: string
    created_at: string
    access_count: number
    chapter_title?: string
  }
  defaultOpen?: boolean
}

/* ────────────────────────────────────────────────────────────────
 *  Detect if leaf content describes a list/table/structure
 *  and format it accordingly.
 * ──────────────────────────────────────────────────────────────── */
function formatLeafContent(content: string): { nodes: React.ReactNode[]; hasTable: boolean; hasFlow: boolean } {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let currentList: { text: string; indent: number }[] = []
  let inList = false
  let hasTable = false
  let hasFlow = false

  const flushList = () => {
    if (currentList.length === 0) return
    nodes.push(
      <ul key={`list-${nodes.length}`} className="space-y-1.5 my-2">
        {currentList.map((item, i) => {
          const isSub = item.indent > 0
          return (
            <li
              key={i}
              className={`flex items-start gap-2 text-sm leading-relaxed ${
                isSub ? 'ml-4 text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className={`mt-1.5 shrink-0 ${isSub ? 'w-1 h-1 bg-slate-400 rounded-full' : 'w-1.5 h-1.5 bg-green-500 rounded-full'}`} />
              <span>{item.text}</span>
            </li>
          )
        })}
      </ul>
    )
    currentList = []
    inList = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    // Detect list items with markers like ■, ❑, -, etc.
    const bulletMatch = trimmed.match(/^[■❑▪•\-\*✓✔]\s*(.*)/)
    if (bulletMatch) {
      inList = true
      currentList.push({ text: bulletMatch[1], indent: 0 })
      continue
    }

    // Sub-list (indented)
    const subMatch = trimmed.match(/^\s+[■❑▪•\-\*✓✔]\s*(.*)/)
    if (subMatch && inList) {
      currentList.push({ text: subMatch[1], indent: 1 })
      continue
    }

    // "Key: value" pairs - format as definition list
    const kvMatch = trimmed.match(/^([^:]+)\s*[:：]\s*(.+)$/)
    if (kvMatch && kvMatch[1].length < 40 && !kvMatch[1].includes('。') && !kvMatch[1].includes('，')) {
      flushList()
      nodes.push(
        <div key={`kv-${nodes.length}`} className="flex gap-2 text-sm my-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0 min-w-[80px]">{kvMatch[1]}：</span>
          <span className="text-slate-600 dark:text-slate-400">{kvMatch[2]}</span>
        </div>
      )
      continue
    }

    // Parenthetical notes like "(only for 10/100)" or "注：xxx"
    const noteMatch = trimmed.match(/^(?:注|注意|Note|注意事項)[:：]\s*(.+)/i)
    if (noteMatch) {
      flushList()
      nodes.push(
        <div key={`note-${nodes.length}`} className="my-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-900/30">
          <div className="flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{noteMatch[1]}</span>
          </div>
        </div>
      )
      continue
    }

    // Detect parenthetical technical notes
    const parenNoteMatch = trimmed.match(/^\s*\(([^)]+)\)\s*(.*)/)
    if (parenNoteMatch && parenNoteMatch[1].length < 60) {
      flushList()
      nodes.push(
        <div key={`paren-${nodes.length}`} className="my-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            <span className="font-medium">{parenNoteMatch[1]}</span>
            {parenNoteMatch[2] && <span className="ml-1">{parenNoteMatch[2]}</span>}
          </p>
        </div>
      )
      continue
    }

    // Flow-related detection
    if (trimmed.includes('流程') || trimmed.includes('步骤') || trimmed.includes('sequence') || trimmed.includes('流程图')) {
      hasFlow = true
    }

    // Table-like detection (if content has | or lots of : separators)
    if (trimmed.includes('|') || (trimmed.includes(':') && trimmed.split(':').length > 3)) {
      hasTable = true
    }

    // Regular paragraph
    if (inList) {
      flushList()
    }
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1.5">
        {trimmed}
      </p>
    )
  }

  flushList()
  return { nodes, hasTable, hasFlow }
}

/* ────────────────────────────────────────────────────────────────
 *  Generate a summary/explanation card for complex leaves
 * ──────────────────────────────────────────────────────────────── */
function generateInsightCard(content: string, topic: string): React.ReactNode | null {
  const t = topic.toLowerCase()
  const c = content.toLowerCase()

  // MAC features insight
  if (t.includes('mac') && t.includes('特性')) {
    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-900/30">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> 关键理解
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
          MAC 子系统负责以太网帧的收发处理。Tx 侧处理数据封装（加 Preamble、CRC、VLAN tag），
          Rx 侧处理数据解封装和过滤（去 Preamble、CRC 校验、地址过滤）。
          支持多种 PHY 接口意味着同一 MAC 核心可以通过不同的引脚配置适配不同的外部 PHY 芯片。
        </p>
      </div>
    )
  }

  // PHY interfaces insight
  if (t.includes('phy') || c.includes('gmii') || c.includes('rgmii') || c.includes('sgmii')) {
    return (
      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-900/30">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> PHY 接口速查
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-indigo-600 dark:text-indigo-400">
          <div><span className="font-medium">GMII/MII</span> — 标准接口，24/16 引脚</div>
          <div><span className="font-medium">RGMII</span> — 精简版，12 引脚，DDR</div>
          <div><span className="font-medium">SGMII</span> — 串行，2 对差分线</div>
          <div><span className="font-medium">RMII</span> — 精简 MII，7 引脚</div>
          <div><span className="font-medium">SMII</span> — 串行 MII，2 引脚</div>
          <div><span className="font-medium">RevMII</span> — 反向 MII，远程 MAC</div>
        </div>
      </div>
    )
  }

  // Scheduling insight
  if (t.includes('调度') || t.includes('scheduling') || t.includes('wrr') || t.includes('priority')) {
    return (
      <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-900/30">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
          <Table2 className="w-3.5 h-3.5" /> 调度算法对比
        </p>
        <div className="space-y-1 text-xs text-emerald-700 dark:text-emerald-400">
          <p><span className="font-medium">Strict Priority</span> — 严格按优先级，高优先级优先，可能饿死低优先级</p>
          <p><span className="font-medium">WRR</span> — 轮询+权重，保证每个队列都有机会，按权重比例分配</p>
          <p><span className="font-medium">DWRR</span> — WRR 改进版，用 deficit counter 更精确地实现带宽比例</p>
          <p><span className="font-medium">CBS</span> — 信用整形，AVB 专用，保证带宽上限和下限</p>
          <p><span className="font-medium">EST/TBS</span> — TSN 时间触发，在精确的时间窗口发送</p>
        </div>
      </div>
    )
  }

  // Architecture insight
  if (t.includes('架构') || t.includes('配置') || t.includes('architecture')) {
    return (
      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-900/30">
        <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> 架构选择指南
        </p>
        <div className="space-y-1 text-xs text-purple-700 dark:text-purple-400">
          <p><span className="font-medium">EQOS-AHB/AXI</span> — 完整方案，适合 SoC 集成，有 DMA 和总线接口</p>
          <p><span className="font-medium">EQOS-DMA</span> — 无总线桥接，适合已有 DMA 的系统</p>
          <p><span className="font-medium">EQOS-MTL</span> — 仅 FIFO 层，适合 FPGA 或自定义 DMA</p>
          <p><span className="font-medium">EQOS-CORE</span> — 仅 MAC，适合需要最小面积的场景</p>
        </div>
      </div>
    )
  }

  return null
}

export default function LeafContent({ leaf, defaultOpen = true }: LeafContentProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { nodes, hasTable, hasFlow } = formatLeafContent(leaf.content)
  const insight = generateInsightCard(leaf.content, leaf.topic)

  return (
    <Card className="bg-green-50/40 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-green-50/60 dark:hover:bg-green-900/20 transition-colors"
      >
        <Sprout className="w-4 h-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{leaf.topic}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 h-4">{leaf.confidence}</Badge>
            <span className="text-[10px] text-slate-400">{leaf.source}</span>
            {hasTable && <Badge className="text-[10px] px-1.5 h-4 bg-amber-100 text-amber-700 border-amber-200">含表格</Badge>}
            {hasFlow && <Badge className="text-[10px] px-1.5 h-4 bg-blue-100 text-blue-700 border-blue-200">含流程</Badge>}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-green-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <CardContent className="px-4 pb-4 pt-0">
          {/* Structured content */}
          <div className="mt-2">
            {nodes}
          </div>

          {/* Auto-generated insight card */}
          {insight}

          {/* Source footer */}
          <div className="mt-3 pt-2 border-t border-green-100 dark:border-green-900/30 flex items-center gap-2 text-[10px] text-slate-400">
            <Quote className="w-3 h-3" />
            <span>{leaf.chapter_title || '未知章节'}</span>
            <span>·</span>
            <span>{new Date(leaf.created_at).toLocaleDateString('zh-CN')}</span>
            {leaf.access_count > 0 && (
              <>
                <span>·</span>
                <span>访问 {leaf.access_count} 次</span>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
