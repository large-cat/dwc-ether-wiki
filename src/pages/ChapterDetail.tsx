import { useParams, Link } from 'react-router'
import { ArrowLeft, BookOpen, FileText, Clock, Sprout, CircleDot, FileSearch, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import growingTree from '@wiki/growing_knowledge_tree.json'
import CachedContent from '@/components/CachedContent'
import LeafContent from '@/components/LeafContent'
import FlowChart from '@/components/FlowChart'

const statusConfig: Record<string, { color: string; label: string; bg: string; border: string; desc: string }> = {
  seeded: {
    color: 'text-slate-500',
    label: '已播种',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-l-slate-400',
    desc: '目录信息，从未读过PDF'
  },
  explored: {
    color: 'text-blue-600',
    label: '已探索',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-blue-500',
    desc: '已读过PDF内容'
  },
  growing: {
    color: 'text-green-600',
    label: '生长中',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-green-500',
    desc: '积累了3+知识叶子'
  },
  mature: {
    color: 'text-purple-600',
    label: '成熟',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-l-purple-500',
    desc: '知识充分覆盖'
  },
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">章节未找到</h2>
            <Link to="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> 返回知识树</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cfg = statusConfig[chapter.status as keyof typeof statusConfig] || statusConfig.seeded
  const cache = (growingTree as any).cache?.entries || {}
  const leaves = (growingTree as any).leaves?.entries || []
  const chCacheKeys = Object.keys(cache).filter((k) => k.startsWith(chapter.id + '_'))
  const chLeaves = leaves.filter((l: any) => l.chapter_id === chapter.id)
  const qaLog = ((growingTree as any).qa_log?.entries || []).filter((q: any) => q.chapter_ids?.includes(chapter.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
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
        {/* Chapter Info Card */}
        <Card className={`mb-6 border-l-4 ${cfg.bg} ${cfg.border}`}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {chapter.number && <Badge className="bg-blue-600 text-white">第{chapter.number}章</Badge>}
              <Badge className={cfg.color}>{cfg.label}</Badge>
              <Badge variant="outline">p.{chapter.page_start}–{chapter.page_end}</Badge>
              <Badge variant="outline">{chLeaves.length} 叶子</Badge>
              <Badge variant="outline">{chCacheKeys.length} 缓存</Badge>
            </div>
            <p className="text-slate-700 dark:text-slate-300">{chapter.description}</p>
            <p className="text-xs text-slate-400 mt-2">{cfg.desc}</p>

            {/* Lazy Loading Status */}
            <div className="mt-4 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                {chapter.status === 'seeded' ? (
                  <><CircleDot className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">尚未读取过PDF。当有人问起这个章节时，会自动读取并缓存内容。</span></>
                ) : (
                  <><Sprout className="w-4 h-4 text-green-500" />
                    <span className="text-slate-600 dark:text-slate-400">已读取 {chapter.reads_count || 0} 次 · 上次读取: {chapter.last_read ? new Date(chapter.last_read).toLocaleString('zh-CN') : '未知'}</span></>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Architecture Flowchart (for ch1 or mature chapters) ── */}
        {(chapter.id === 'ch1' || chapter.status === 'mature') && (
          <div className="mb-6">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-purple-600" />
                  系统架构流程图
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

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main Content - 3 cols */}
          <div className="lg:col-span-3 space-y-6">
            {/* ── Knowledge Leaves (prioritized, at top) ── */}
            {chLeaves.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Sprout className="w-5 h-5 text-green-600" /> 知识叶子
                  <span className="text-xs font-normal text-slate-400">({chLeaves.length} 个)</span>
                </h2>
                <div className="space-y-3">
                  {chLeaves.map((leaf: any) => (
                    <LeafContent key={leaf.id} leaf={leaf} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Cached Content (collapsible) ── */}
            {chCacheKeys.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" /> PDF 缓存原文
                  <span className="text-xs font-normal text-slate-400">({chCacheKeys.length} 个缓存块，点击展开)</span>
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
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">尚未缓存内容</p>
                  <p className="text-xs text-slate-400 mt-1">在Claude Code中提问此章节相关话题，将自动触发PDF读取并缓存</p>
                </CardContent>
              </Card>
            )}

            {/* ── Empty state for leaves ── */}
            {chLeaves.length === 0 && chapter.status !== 'seeded' && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  此章节已有 PDF 缓存，但尚未生成知识叶子。建议在 Claude Code 中提问，让知识树继续生长。
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Quick Summary Card ── */}
            {chapter.id === 'ch1' && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">速查手册</CardTitle>
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

            {/* ── QA History ── */}
            {qaLog.length > 0 && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">相关问答记录</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {qaLog.map((q: any, i: number) => (
                    <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{q.question}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(q.timestamp).toLocaleDateString('zh-CN')}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Stats ── */}
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">统计</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex justify-between"><span>状态</span><span className={cfg.color}>{cfg.label}</span></div>
                <div className="flex justify-between"><span>读取次数</span><span>{chapter.reads_count || 0}</span></div>
                <div className="flex justify-between"><span>知识叶子</span><span>{chLeaves.length}</span></div>
                <div className="flex justify-between"><span>缓存条目</span><span>{chCacheKeys.length}</span></div>
                <div className="flex justify-between"><span>相关问答</span><span>{qaLog.length}</span></div>
              </CardContent>
            </Card>

            {/* ── Quick Nav ── */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">导航</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300"><ArrowLeft className="w-4 h-4" /> 返回知识树</Link>
                <Link to="/qa" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300"><BookOpen className="w-4 h-4" /> 智能问答</Link>
              </CardContent>
            </Card>

            {/* ── Related Chapters (adjacent in TOC) ── */}
            {(() => {
              const idx = growingTree.chapters.findIndex((c: any) => c.id === chapter.id)
              const prev = idx > 0 ? growingTree.chapters[idx - 1] : null
              const next = idx < growingTree.chapters.length - 1 ? growingTree.chapters[idx + 1] : null
              return (prev || next) ? (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">相邻章节</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {prev && (
                      <Link to={`/chapter/${prev.id}`} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>第{prev.number}章 · {prev.title_cn}</span>
                      </Link>
                    )}
                    {next && (
                      <Link to={`/chapter/${next.id}`} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
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
