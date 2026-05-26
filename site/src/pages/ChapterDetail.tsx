import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LeafContent from '@/components/LeafContent'
import FlowChart from '@/components/FlowChart'
import type { Chapter, ChapterLeavesConfig, Leaf } from '@/types/wiki'

const statusLabel: Record<string, string> = {
  seeded: '目录',
  explored: '已读',
  growing: '完善中',
  mature: '完整',
}

/* ── Auto-generate architecture flowchart for ch1 ── */
const ARCH_FLOWCHART = `flowchart LR
  subgraph Host["Host / SoC"]
    MEM["System Memory"]
    CPU["CPU"]
  end

  subgraph Bus["AMBA Bus"]
    AXI["AXI Master\n(数据)"]
    AHB["AHB Master\n(数据)"]
    SLAVE["AHB/AXI/APB Slave\n(CSR寄存器)"]
  end

  subgraph EQOS["DWC_ether_qos Core"]
    DMA["DMA Block\n(最多8Tx+8Rx通道)"]
    MTL["MTL Transaction Layer\n(Tx/Rx FIFO + 队列)"]
    MAC["MAC Core\n(帧处理 + 过滤)"]
  end

  subgraph PHY_IF["PHY Interface"]
    MUX["Interface MUX"]
    GMII["GMII/MII"]
    RGMII["RGMII"]
    SGMII["SGMII"]
    RMII["RMII\n(10/100 only)"]
  end

  subgraph EXT["External"]
    PHY_CHIP["External PHY"]
    NET["Ethernet Network"]
  end

  MEM <--> AXI & AHB
  CPU --> SLAVE
  AXI & AHB <--> DMA
  SLAVE --> MAC & DMA & MTL
  DMA <--> MTL
  MTL <--> MAC
  MAC --> MUX
  MUX --> GMII & RGMII & SGMII & RMII
  GMII & RGMII & SGMII & RMII --> PHY_CHIP
  PHY_CHIP <--> NET

  style Host fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
  style Bus fill:#fef3c7,stroke:#d97706,color:#78350f
  style EQOS fill:#f0fdf4,stroke:#16a34a,color:#14532d
  style PHY_IF fill:#fce7f3,stroke:#db2777,color:#831843
  style EXT fill:#e0e7ff,stroke:#6366f1,color:#312e81`

export default function ChapterDetail() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [tree, setTree] = useState<{ chapters: Chapter[] } | null>(null)
  const [chLeaves, setChLeaves] = useState<Leaf[]>([])
  const [loading, setLoading] = useState(true)

  // Stage 1: Load tree
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}growing_knowledge_tree.json`)
      .then(r => r.json())
      .then(data => {
        setTree(data)
      })
      .catch(() => setLoading(false))
  }, [])

  // Stage 2: Load chapter leaf config
  useEffect(() => {
    if (!tree || !chapterId) return

    const chapter = tree.chapters.find((c: Chapter) => c.id === chapterId)
    if (!chapter) {
      setLoading(false)
      return
    }

    fetch(`${import.meta.env.BASE_URL}${chapter.leaves_config}`)
      .then(r => r.json())
      .then((config: ChapterLeavesConfig) => {
        setChLeaves(config.leaves || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tree, chapterId])

  const chapter = tree?.chapters?.find((ch: Chapter) => ch.id === (chapterId || ''))

  // Scroll to leaf anchor on mount / hash change (HashRouter safe)
  useEffect(() => {
    const hash = location.hash
    if (hash && hash.startsWith('#leaf_')) {
      const id = hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [location.hash])

  const scrollToLeaf = (id: string) => {
    navigate(`/chapter/${chapterId}#${id}`, { replace: true })
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">加载中...</p>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">章节未找到</h2>
            <Link to="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> 返回知识库</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const idx = tree?.chapters?.findIndex((c: Chapter) => c.id === chapter.id) ?? -1
  const prev = idx > 0 ? tree?.chapters?.[idx - 1] ?? null : null
  const next = idx < (tree?.chapters?.length ?? 0) - 1 ? tree?.chapters?.[idx + 1] ?? null : null

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">{chapter.title_cn}</h1>
              <p className="text-xs text-slate-400">{chapter.title}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Top Chapter Nav */}
      <div className="border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-sm">
          {prev ? (
            <Link to={`/chapter/${prev.id}`} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              <span className="hidden sm:inline">第{prev.number}章 · {prev.title_cn}</span>
              <span className="sm:hidden">上一章</span>
            </Link>
          ) : <span />}
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">目录</Link>
          {next ? (
            <Link to={`/chapter/${next.id}`} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
              <span className="hidden sm:inline">{next.title_cn} · 第{next.number}章</span>
              <span className="sm:hidden">下一章</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : <span />}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 py-8">
          {/* Main Content — takes 9 of 12 columns (~75%) */}
          <main className="lg:col-span-9">
            {/* Chapter Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3 text-sm">
                {chapter.number && <Badge className="bg-blue-600 text-white text-xs">第{chapter.number}章</Badge>}
                <span className="text-slate-400 text-xs">p.{chapter.page_start}–{chapter.page_end}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400 text-xs">{statusLabel[chapter.status as keyof typeof statusLabel] || chapter.status}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{chapter.title_cn}</h1>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{chapter.description}</p>
            </div>

            {/* Flowchart */}
            {(chapter.id === 'ch1' || chapter.status === 'mature') && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">系统架构</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  DWC_ether_qos 在 SoC 中的位置和数据流向。数据通过 AXI/AHB 总线在 Host Memory 和 MAC 之间传输，
                  中间经过 DMA、MTL 队列层和 MAC 核心处理，最终通过 PHY 接口发送到外部网络。
                </p>
                <FlowChart chart={ARCH_FLOWCHART} />
              </div>
            )}

            {/* Chapter Content — leaves rendered as document sections */}
            {chLeaves.length > 0 && (
              <div className="mb-10">
                {chLeaves.map((leaf: Leaf, idx: number) => (
                  <section key={leaf.id} id={leaf.id} className="mb-8 scroll-mt-24">
                    {idx === 0 && (
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                        章节内容
                      </h2>
                    )}
                    <LeafContent leaf={leaf} />
                  </section>
                ))}
              </div>
            )}


            {/* Bottom Chapter Nav */}
            <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                {prev ? (
                  <Link to={`/chapter/${prev.id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <div>
                      <div className="text-xs text-slate-400">上一章</div>
                      <div>第{prev.number}章 · {prev.title_cn}</div>
                    </div>
                  </Link>
                ) : <div />}
                {next ? (
                  <Link to={`/chapter/${next.id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors text-right">
                    <div>
                      <div className="text-xs text-slate-400">下一章</div>
                      <div>第{next.number}章 · {next.title_cn}</div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : <div />}
              </div>
            </div>
          </main>

          {/* Sidebar — takes 3 of 12 columns (~25%), sticky */}
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* TOC from leaf topics */}
              {chLeaves.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">本章内容</p>
                  <nav className="space-y-1 border-l border-slate-200 dark:border-slate-700">
                    {chLeaves.map((leaf: Leaf) => (
                      <button
                        key={leaf.id}
                        onClick={() => scrollToLeaf(leaf.id)}
                        className="block w-full text-left pl-3 py-1 text-sm text-slate-500 hover:text-blue-600 hover:border-l-2 hover:border-blue-600 -ml-px transition-colors"
                      >
                        {leaf.topic}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Quick Summary — compact, no Card */}
              {chapter.id === 'ch1' && (
                <div className="text-sm">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">速查</p>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div><span className="text-slate-500">速率:</span> 10/100/1000 Mbps</div>
                    <div><span className="text-slate-500">PHY:</span> GMII, RGMII, SGMII, RMII...</div>
                    <div><span className="text-slate-500">队列:</span> 8 Tx + 8 Rx</div>
                    <div><span className="text-slate-500">总线:</span> AHB, AXI, APB</div>
                  </div>
                </div>
              )}

              {/* Chapter jump — compact nav */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">跳转</p>
                <div className="space-y-1 text-sm">
                  <Link to="/" className="block text-slate-500 hover:text-blue-600 transition-colors">← 返回目录</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
