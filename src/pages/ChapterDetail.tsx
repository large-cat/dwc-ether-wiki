import { useParams, Link } from 'react-router'
import { ArrowLeft, BookOpen, FileText, Clock, FileSearch, AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import growingTree from '@wiki/growing_knowledge_tree.json'
import CachedContent from '@/components/CachedContent'
import LeafContent from '@/components/LeafContent'
import FlowChart from '@/components/FlowChart'

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
  const chapter = (growingTree.chapters as any[]).find((ch: any) => ch.id === (chapterId || ''))

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

  const cache = (growingTree as any).cache?.entries || {}
  const leaves = (growingTree as any).leaves?.entries || []
  const chCacheKeys = Object.keys(cache).filter((k) => k.startsWith(chapter.id + '_'))
  const chLeaves = leaves.filter((l: any) => l.chapter_id === chapter.id)
  const qaLog = ((growingTree as any).qa_log?.entries || []).filter((q: any) => q.chapter_ids?.includes(chapter.id))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div className="p-2 bg-blue-600 rounded-lg"><BookOpen className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{chapter.title_cn}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{chapter.title}</p>
            </div>
          </div>
          <Link to="/qa" className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">去提问</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chapter Info */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {chapter.number && <Badge className="bg-blue-600 text-white">第{chapter.number}章</Badge>}
            <Badge variant="outline">p.{chapter.page_start}–{chapter.page_end}</Badge>
            <span className="text-xs text-slate-400">{statusLabel[chapter.status as keyof typeof statusLabel] || chapter.status}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300">{chapter.description}</p>

          {chapter.status !== 'seeded' && (
            <p className="text-xs text-slate-400 mt-2">
              已读取 {chapter.reads_count || 0} 次
              {chapter.last_read && ` · 上次更新 ${new Date(chapter.last_read).toLocaleDateString('zh-CN')}`}
            </p>
          )}
        </div>

        {/* Flowchart */}
        {(chapter.id === 'ch1' || chapter.status === 'mature') && (
          <div className="mb-8">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-purple-600" />
                  系统架构
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  DWC_ether_qos 在 SoC 中的位置和数据流向。数据通过 AXI/AHB 总线在 Host Memory 和 MAC 之间传输，
                  中间经过 DMA、MTL 队列层和 MAC 核心处理，最终通过 PHY 接口发送到外部网络。
                </p>
                <FlowChart chart={ARCH_FLOWCHART} />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* ── Chapter Content (leaves as document) ── */}
            {chLeaves.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  章节内容
                </h2>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4">
                  {chLeaves.map((leaf: any) => (
                    <LeafContent key={leaf.id} leaf={leaf} />
                  ))}
                </div>
              </section>
            )}

            {/* ── PDF Source Content ── */}
            {chCacheKeys.length > 0 ? (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  原文参考
                  <span className="text-xs font-normal text-slate-400">({chCacheKeys.length} 个缓存段)</span>
                </h2>
                <div className="space-y-3">
                  {chCacheKeys.map((key) => (
                    <CachedContent
                      key={key}
                      cacheKey={key}
                      content={cache[key]}
                      chapterPageStart={chapter.page_start}
                      defaultOpen={chCacheKeys.length === 1}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">此章节尚未提取内容</p>
                <p className="text-xs text-slate-400 mt-1">在 Claude Code 中提问此章节相关话题，将自动读取并整理</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Summary */}
            {chapter.id === 'ch1' && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">速查</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">数据速率</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">10 / 100 / 1000 Mbps</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">PHY 接口</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">GMII, RGMII, SGMII, RMII, SMII, TBI, RTBI, RevMII</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">队列数量</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">最多 8 个 Tx 队列 + 8 个 Rx 队列</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">总线接口</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">AHB Master/Slave, AXI3/AXI4 Master, AXI4-Lite/AXI3 Slave, APB Slave</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">关键特性</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">TSO/UFO, 1588 PTP, TSN (EST/Frame Preemption), DCB (PFC/ETS), AVB (CBS)</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Q&A */}
            {qaLog.length > 0 && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">相关问答</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {qaLog.map((q: any, i: number) => (
                    <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                      <p className="text-slate-700 dark:text-slate-300">{q.question}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(q.timestamp).toLocaleDateString('zh-CN')}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">导航</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Link to="/" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> 返回知识库
                </Link>
                <Link to="/qa" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300">
                  <BookOpen className="w-4 h-4" /> 智能问答
                </Link>
              </CardContent>
            </Card>

            {/* Adjacent chapters */}
            {(() => {
              const idx = growingTree.chapters.findIndex((c: any) => c.id === chapter.id)
              const prev = idx > 0 ? growingTree.chapters[idx - 1] : null
              const next = idx < growingTree.chapters.length - 1 ? growingTree.chapters[idx + 1] : null
              return (prev || next) ? (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">相邻章节</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {prev && (
                      <Link to={`/chapter/${prev.id}`} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        <span>第{prev.number}章 · {prev.title_cn}</span>
                      </Link>
                    )}
                    {next && (
                      <Link to={`/chapter/${next.id}`} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>第{next.number}章 · {next.title_cn}</span>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : null
            })()}
          </div>
        </div>
      </main>
    </div>
  )
}
