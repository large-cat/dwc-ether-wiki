import { useState, useEffect } from 'react'
import { ChevronDown, FileText, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import FlowChart from './FlowChart'

interface PageBlock {
  page: number
  content: string
}

function parseCacheContent(raw: string): PageBlock[] {
  const blocks: PageBlock[] = []
  const lines = raw.split('\n')
  let currentPage = 0
  let currentContent: string[] = []

  for (const line of lines) {
    const match = line.match(/^---\s*Page\s*(\d+)\s*---/)
    if (match) {
      if (currentPage > 0 && currentContent.length > 0) {
        blocks.push({ page: currentPage, content: currentContent.join('\n').trim() })
      }
      currentPage = parseInt(match[1], 10)
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  if (currentPage > 0 && currentContent.length > 0) {
    blocks.push({ page: currentPage, content: currentContent.join('\n').trim() })
  }

  // Fallback: if no page markers, treat whole thing as one block
  if (blocks.length === 0 && raw.trim()) {
    blocks.push({ page: 0, content: raw.trim() })
  }

  return blocks
}

/* ────────────────────────────────────────────────────────────────
 *  Try to detect if content describes a flow / block diagram
 *  and generate a Mermaid flowchart.
 * ──────────────────────────────────────────────────────────────── */
function detectFlowchart(text: string): string | null {
  const t = text.toLowerCase()

  // System-level block diagram for ch1
  if (t.includes('ahb') && t.includes('axi') && t.includes('dma') && t.includes('mac') && t.includes('mtl')) {
    return `flowchart LR
    subgraph App["Application / Host"]
      AHB["AHB Master\n(数据接口)"]
      AXI["AXI Master\n(数据接口)"]
      SLAVE["AHB/AXI/APB Slave\n(CSR寄存器访问)"]
    end

    subgraph DMA["DMA Block"]
      ARB["DMA Arbiter\n(仲裁器)"]
      TXCH["Tx Channels\n(最多8个)"]
      RXCH["Rx Channels\n(最多8个)"]
    end

    subgraph MTL["MTL Transaction Layer"]
      TXQ["Tx Queues\n(最多8个)"]
      RXQ["Rx Queues\n(最多8个)"]
    end

    subgraph MAC["MAC Core"]
      TXMAC["Tx MAC"]
      RXMAC["Rx MAC"]
      PHYMUX["PHY Interface MUX"]
    end

    subgraph PHY["PHY Interfaces"]
      GMII["GMII/MII"]
      RGMII["RGMII"]
      SGMII["SGMII"]
      RMII["RMII"]
    end

    AHB --> ARB
    AXI --> ARB
    ARB --> TXCH & RXCH
    TXCH --> TXQ
    RXCH --> RXQ
    TXQ --> TXMAC
    RXQ --> RXMAC
    TXMAC & RXMAC --> PHYMUX
    PHYMUX --> GMII & RGMII & SGMII & RMII

    SLAVE -.->|寄存器配置| TXCH & RXCH & TXQ & RXQ & TXMAC & RXMAC

    style App fill:#dbeafe,stroke:#3b82f6
    style DMA fill:#fef3c7,stroke:#d97706
    style MTL fill:#f0fdf4,stroke:#16a34a
    style MAC fill:#fce7f3,stroke:#db2777
    style PHY fill:#e0e7ff,stroke:#6366f1`
  }

  // Packet flow: Tx direction
  if (t.includes('transmit') && t.includes('fifo') && t.includes('mac') && !t.includes('receive')) {
    return `flowchart LR
    MEM["Host Memory\n(系统内存)"] -->|"Descriptor Ring"| DMA
    DMA -->|"AXI/AHB Burst"| MTL["MTL Tx FIFO"]
    MTL -->|"Store-and-Forward\nor Cut-through"| MAC["MAC Tx"]
    MAC -->|"GMII/RGMII/\nSGMII/RMII"| PHY["External PHY"]
    PHY -->|"Ethernet Cable"| NET["网络"]

    style MEM fill:#dbeafe
    style DMA fill:#fef3c7
    style MTL fill:#f0fdf4
    style MAC fill:#fce7f3
    style PHY fill:#e0e7ff`
  }

  // Packet flow: Rx direction
  if (t.includes('receive') && t.includes('fifo') && t.includes('mac')) {
    return `flowchart RL
    NET["网络"] -->|"Ethernet Cable"| PHY["External PHY"]
    PHY -->|"GMII/RGMII/\nSGMII/RMII"| MAC["MAC Rx"]
    MAC -->|"CRC/PAD剥离\n地址过滤"| MTL["MTL Rx FIFO"]
    MTL -->|"Threshold 或\nStore-and-Forward"| DMA
    DMA -->|"Descriptor Ring"| MEM["Host Memory\n(系统内存)"]

    style MEM fill:#dbeafe
    style DMA fill:#fef3c7
    style MTL fill:#f0fdf4
    style MAC fill:#fce7f3
    style PHY fill:#e0e7ff`
  }

  return null
}

/* ────────────────────────────────────────────────────────────────
 *  Detect scheduling / queueing diagrams
 * ──────────────────────────────────────────────────────────────── */
function detectSchedulingChart(text: string): string | null {
  const t = text.toLowerCase()

  if (t.includes('scheduling') || t.includes('weighted round robin') || t.includes('strict priority') || t.includes('dwrr') || t.includes('wrr')) {
    return `flowchart TD
    subgraph TX_SCHED["Tx 队列调度器"]
      Q0["Queue 0\n(最高优先级)"]
      Q1["Queue 1"]
      Q2["Queue 2"]
      Q3["Queue ..."]
      QN["Queue N\n(最低优先级)"]
    end

    ARB["调度仲裁器"]

    Q0 & Q1 & Q2 & Q3 & QN --> ARB
    ARB -->|"选中的包"| MAC["MAC Tx"]

    subgraph ALG["支持的调度算法"]
      SP["Strict Priority\n严格优先级"]
      WRR["Weighted Round Robin\n加权轮询"]
      DWRR["Deficit WRR\n(仅DCB)"]
      WFQ["Weighted Fair Queuing\n(仅DCB)"]
      CBS["Credit-Based Shaper\n(仅AVB)"]
      EST["Enhancement to Scheduled Traffic\n(仅TSN)"]
      TBS["Time-Based Scheduling\n(仅TSN)"]
    end

    style ARB fill:#fef3c7,stroke:#d97706
    style SP fill:#dbeafe
    style WRR fill:#dbeafe
    style DWRR fill:#dbeafe
    style WFQ fill:#dbeafe
    style CBS fill:#f0fdf4
    style EST fill:#fce7f3
    style TBS fill:#fce7f3`
  }

  return null
}

/* ────────────────────────────────────────────────────────────────
 *  Detect initialization / programming sequence
 * ──────────────────────────────────────────────────────────────── */
function detectInitSequence(text: string): string | null {
  const t = text.toLowerCase()

  if ((t.includes('initialization') || t.includes('init sequence') || t.includes('programming')) &&
      (t.includes('register') || t.includes('dma') || t.includes('mac') || t.includes('descriptor'))) {
    return `flowchart TD
    START(["开始初始化"]) --> RESET["1. 软件复位\nDMA_MODE.SWR = 1"]
    RESET --> WAIT["2. 等待复位完成\nDMA_MODE.SWR == 0"]
    WAIT --> PHY["3. 配置 PHY\n通过 MDIO 接口"]
    PHY --> MAC["4. 配置 MAC\nMAC 地址、帧过滤、\n流控、VLAN 等"]
    MAC --> MTL["5. 配置 MTL\n队列大小、阈值、\n调度算法"]
    MTL --> DMA["6. 配置 DMA\n描述符基址、\nBurst 长度、中断"]
    DMA --> DESC["7. 初始化描述符\nTx/Rx Descriptor Ring"]
    DESC --> RX["8. 启动接收\nDMA_CHn.RX = 1"]
    RX --> TX["9. 启动发送\nDMA_CHn.TX = 1"]
    TX --> RUNNING(["正常运行"])

    style START fill:#dbeafe,stroke:#3b82f6
    style RUNNING fill:#f0fdf4,stroke:#16a34a
    style RESET fill:#fef3c7
    style WAIT fill:#fef3c7`
  }

  return null
}

function getFlowchartForContent(text: string): string | null {
  return detectFlowchart(text) || detectSchedulingChart(text) || detectInitSequence(text)
}

/* ────────────────────────────────────────────────────────────────
 *  Try to format plain text into structured markdown-like blocks
 * ──────────────────────────────────────────────────────────────── */
function formatStructuredText(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let inList = false

  const flushList = () => {
    if (currentList.length === 0) return
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-sm text-slate-600 dark:text-slate-400">
        {currentList.map((item, i) => (
          <li key={i} className="leading-relaxed">{item}</li>
        ))}
      </ul>
    )
    currentList = []
    inList = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect list items (bullet points like ■, ❑, -, etc.)
    const bulletMatch = trimmed.match(/^[■❑▪•\-\*]\s*(.*)/)
    if (bulletMatch) {
      if (!inList) {
        inList = true
      }
      currentList.push(bulletMatch[1])
      continue
    }

    // Sub-list items (indented bullets)
    const subBulletMatch = trimmed.match(/^\s+[■❑▪•\-\*]\s*(.*)/)
    if (subBulletMatch && inList) {
      currentList.push(`  └─ ${subBulletMatch[1]}`)
      continue
    }

    // Empty line ends list
    if (trimmed === '' && inList) {
      flushList()
      continue
    }

    // Section headers (e.g., "1.2.3 Feature Name")
    const sectionMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+(.+)/)
    if (sectionMatch && trimmed.length < 80) {
      flushList()
      elements.push(
        <h4 key={`h-${elements.length}`} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">
          {sectionMatch[1]} {sectionMatch[2]}
        </h4>
      )
      continue
    }

    // Figure references
    const figureMatch = trimmed.match(/Figure\s+(\d+-\d+)\s+(.+)/i)
    if (figureMatch) {
      flushList()
      elements.push(
        <div key={`fig-${elements.length}`} className="my-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-900/30">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            图 {figureMatch[1]}: {figureMatch[2]}
          </p>
        </div>
      )
      continue
    }

    // Note callouts
    if (trimmed.toLowerCase() === 'note' || trimmed === '注意' || trimmed === '注') {
      flushList()
      // Look ahead for note content
      const noteLines: string[] = []
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '' && !lines[j].trim().match(/^---\s*Page/)) {
        noteLines.push(lines[j].trim())
        j++
      }
      if (noteLines.length > 0) {
        elements.push(
          <div key={`note-${elements.length}`} className="my-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-900/30">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Note</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{noteLines.join(' ')}</p>
          </div>
        )
        i = j - 1
      }
      continue
    }

    // Regular paragraph
    if (trimmed) {
      if (inList) {
        // If we were in a list but this line doesn't start with bullet, end the list
        flushList()
      }
      // Try to detect if it's a continuation of previous paragraph
      if (elements.length > 0 && typeof elements[elements.length - 1] === 'object' &&
          (elements[elements.length - 1] as any)?.key?.startsWith('p-')) {
        // Merge with previous paragraph
      }
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed my-1.5">
          {trimmed}
        </p>
      )
    }
  }

  flushList()

  return <div>{elements}</div>
}

/* ────────────────────────────────────────────────────────────────
 *  Main component: renders cache content with collapsible blocks
 * ──────────────────────────────────────────────────────────────── */
interface CachedContentProps {
  cacheKey: string
  contentPath: string
  chapterPageStart: number
  defaultOpen?: boolean
}

export default function CachedContent({ cacheKey, contentPath, chapterPageStart, defaultOpen = false }: CachedContentProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${import.meta.env.BASE_URL}${contentPath}`)
      .then(r => r.text())
      .then(text => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent('')
        setLoading(false)
      })
  }, [contentPath])

  const blocks = parseCacheContent(content)

  // Parse cache key to get page range info
  const pageRangeMatch = cacheKey.match(/_p(\d+)-(\d+)/)
  const cacheStartPage = pageRangeMatch ? parseInt(pageRangeMatch[1], 10) : chapterPageStart
  const cacheEndPage = pageRangeMatch ? parseInt(pageRangeMatch[2], 10) : chapterPageStart

  const totalPages = blocks.length
  const totalChars = content.length

  // Try to generate a flowchart from the content
  const flowchart = getFlowchartForContent(content)

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            缓存 {cacheKey.replace(/^ch\d+_/, '')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            PDF 第 {cacheStartPage}–{cacheEndPage} 页 · {totalPages} 个页面块 · {totalChars.toLocaleString()} 字符
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <CardContent className="px-4 pb-4 pt-0">
          {loading ? (
            <div className="text-sm text-slate-400 py-4">Loading cache content...</div>
          ) : (
            <>
              {/* Flowchart (if detected) */}
              {flowchart && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    自动解析：逻辑流程图
                  </p>
                  <FlowChart chart={flowchart} />
                  <p className="text-[10px] text-slate-400 mt-1.5 italic">
                    ↑ 根据缓存内容自动生成的流程图，帮助理解原文中的系统结构和数据流向。
                  </p>
                </div>
              )}

              {/* Page blocks */}
              <div className="space-y-3">
                {blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="border-l-2 border-blue-300 dark:border-blue-700 pl-3"
                  >
                    {block.page > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                          PDF p.{block.page}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          原文引用
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {formatStructuredText(block.content)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Raw view toggle */}
              <details className="mt-4">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-500 select-none">
                  查看原始文本
                </summary>
                <pre className="mt-2 text-xs text-slate-500 dark:text-slate-500 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700 leading-relaxed">
                  {content}
                </pre>
              </details>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
