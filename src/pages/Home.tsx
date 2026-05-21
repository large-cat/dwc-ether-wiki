import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, MessageCircle, Search, ChevronRight, Layers, Cpu, Zap, Shield, Sprout, TreePine, Sparkles, CircleDot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import growingTree from '@wiki/growing_knowledge_tree.json'

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode; desc: string }> = {
  seeded: { color: 'bg-slate-100 text-slate-500 border-slate-200', label: '已播种', icon: <CircleDot className="w-3 h-3" />, desc: '目录信息，等待首次提问' },
  explored: { color: 'bg-blue-50 text-blue-600 border-blue-200', label: '已探索', icon: <Sprout className="w-3 h-3" />, desc: '已读过PDF内容' },
  growing: { color: 'bg-green-50 text-green-600 border-green-200', label: '生长中', icon: <TreePine className="w-3 h-3" />, desc: '积累了多个知识叶子' },
  mature: { color: 'bg-purple-50 text-purple-600 border-purple-200', label: '成熟', icon: <Sparkles className="w-3 h-3" />, desc: '知识充分覆盖' },
}

const iconMap: Record<string, React.ReactNode> = {
  ch1: <Cpu className="w-5 h-5" />, ch2: <Layers className="w-5 h-5" />, ch3: <Zap className="w-5 h-5" />,
  ch4: <Layers className="w-5 h-5" />, ch5: <Zap className="w-5 h-5" />, ch6: <Shield className="w-5 h-5" />,
  ch7: <Cpu className="w-5 h-5" />, ch8: <Layers className="w-5 h-5" />, ch9: <Zap className="w-5 h-5" />,
  ch10: <Cpu className="w-5 h-5" />, ch11: <BookOpen className="w-5 h-5" />, ch12: <Layers className="w-5 h-5" />,
  ch13: <Cpu className="w-5 h-5" />, ch14: <Zap className="w-5 h-5" />, ch15: <BookOpen className="w-5 h-5" />,
  ch16: <Layers className="w-5 h-5" />, ch17: <Cpu className="w-5 h-5" />, ch18: <Shield className="w-5 h-5" />,
  ch19: <Shield className="w-5 h-5" />, ch20: <BookOpen className="w-5 h-5" />,
}

function getChapterIcon(chapterId: string) {
  return iconMap[chapterId] || <BookOpen className="w-5 h-5" />
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  const chapters = growingTree.chapters as any[]
  const cache = (growingTree as any).cache?.entries || {}
  const leaves = (growingTree as any).leaves?.entries || []
  const qaLog = (growingTree as any).qa_log?.entries || []
  const meta = growingTree.metadata as any

  // Filter chapters based on search
  const filteredChapters = searchQuery
    ? chapters.filter((ch) => {
        const q = searchQuery.toLowerCase()
        // Search chapter title/desc
        if (ch.title_cn?.toLowerCase().includes(q)) return true
        if (ch.title?.toLowerCase().includes(q)) return true
        if (ch.description?.toLowerCase().includes(q)) return true
        // Search leaves
        const chLeaves = leaves.filter((l: any) => l.chapter_id === ch.id)
        if (chLeaves.some((l: any) => l.topic?.toLowerCase().includes(q) || l.content?.toLowerCase().includes(q))) return true
        // Search cache
        const chCacheKeys = Object.keys(cache).filter((k) => k.startsWith(ch.id + '_'))
        if (chCacheKeys.some((k) => cache[k]?.toLowerCase().includes(q))) return true
        return false
      })
    : chapters

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Stats
  const statusCounts = { seeded: 0, explored: 0, growing: 0, mature: 0 }
  chapters.forEach((ch) => { statusCounts[ch.status as keyof typeof statusCounts]++ })
  const cachedChars = Object.values(cache).reduce((acc: number, c: any) => acc + (c?.length || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                DWC以太网QoS可生长知识树
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sprout className="w-3 h-3" />
                懒加载 · 按需生长 · v{meta.knowledge_tree_version}
              </p>
            </div>
          </div>
          <Link to="/qa" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>智能问答</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-600">{chapters.length}</div>
              <div className="text-sm text-slate-500">知识章节</div>
              <div className="text-xs text-slate-400 mt-1">
                {statusCounts.seeded}播种 / {statusCounts.explored}探索 / {statusCounts.growing}生长 / {statusCounts.mature}成熟
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{leaves.length}</div>
              <div className="text-sm text-slate-500">知识叶子</div>
              <div className="text-xs text-slate-400 mt-1">从问答中生长出的洞察</div>
            </CardContent>
          </Card>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(cache).length}</div>
              <div className="text-sm text-slate-500">缓存条目</div>
              <div className="text-xs text-slate-400 mt-1">{cachedChars.toLocaleString()} 字符已缓存</div>
            </CardContent>
          </Card>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{meta.total_reads_from_pdf}</div>
              <div className="text-sm text-slate-500">PDF读取次数</div>
              <div className="text-xs text-slate-400 mt-1">{qaLog.length} 次问答 · 按需加载</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="搜索知识树（搜索标题、描述、已缓存内容、知识叶子...）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-6 text-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>

        {/* Legend */}
        <div className="flex gap-2 mb-4 text-xs flex-wrap">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <span key={key} className={`flex items-center gap-1 px-2 py-1 rounded border ${cfg.color}`}>
              {cfg.icon} {cfg.label}: {cfg.desc}
            </span>
          ))}
        </div>

        {/* Knowledge Tree */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            知识章节
          </h2>

          {filteredChapters.map((ch) => {
            const isExpanded = expandedChapters.has(ch.id)
            const cfg = statusConfig[ch.status as keyof typeof statusConfig] || statusConfig.seeded
            const chLeaves = leaves.filter((l: any) => l.chapter_id === ch.id)
            const chCacheKeys = Object.keys(cache).filter((k) => k.startsWith(ch.id + '_'))
            const hasCache = chCacheKeys.length > 0

            return (
              <Card key={ch.id} className="overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleChapter(ch.id)}>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    {getChapterIcon(ch.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ch.number && <Badge variant="secondary" className="text-xs">第{ch.number}章</Badge>}
                      <Badge className={`text-xs ${cfg.color} border`}>
                        <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                      </Badge>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{ch.title_cn}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ch.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>p.{ch.page_start}-{ch.page_end}</span>
                      <span>{chLeaves.length} 叶子</span>
                      <span>{chCacheKeys.length} 缓存</span>
                      <span>{ch.reads_count || 0} 次读取</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-3">
                    {/* Cache entries */}
                    {hasCache && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">已缓存内容</p>
                        {chCacheKeys.map((key) => (
                          <div key={key} className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900/30 mb-1">
                            <p className="text-xs text-blue-500 font-mono">{key}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-1">{(cache[key] as string).slice(0, 300)}...</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Knowledge Leaves */}
                    {chLeaves.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                          <Sprout className="w-3 h-3" /> 知识叶子
                        </p>
                        {chLeaves.map((leaf: any) => (
                          <div key={leaf.id} className="p-2 bg-green-50/50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-900/30 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-green-800 dark:text-green-300">{leaf.topic}</span>
                              <Badge variant="outline" className="text-[10px] px-1">{leaf.confidence}</Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{leaf.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {!hasCache && chLeaves.length === 0 && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <CircleDot className="w-3 h-3" /> 已播种，等待首次提问来触发PDF读取...
                        </p>
                      </div>
                    )}

                    <Link to={`/chapter/${ch.id}`} className="block text-center py-2 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded transition-colors">
                      查看详情 →
                    </Link>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Quick Access */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-600" /> 智能问答</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">通过问答让知识树生长。每次提问都可能触发PDF读取并产生新的知识叶子。</p>
              <Link to="/qa" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                开始提问 <ChevronRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sprout className="w-5 h-5 text-green-600" /> Claude Code 集成</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">使用CLAUDE.md指令文件，在Claude Code中实现懒加载知识生长。</p>
              <div className="text-xs text-slate-500 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg font-mono">/load CLAUDE.md</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
