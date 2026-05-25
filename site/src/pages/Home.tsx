import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, MessageCircle, Search, ChevronRight, Layers, Cpu, Zap, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import growingTree from '@wiki/growing_knowledge_tree.json'

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

const statusLabel: Record<string, string> = {
  seeded: '目录',
  explored: '已读',
  growing: '完善中',
  mature: '完整',
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  const chapters = growingTree.chapters as any[]
  const leaves = (growingTree as any).leaves?.entries || []
  const qaLog = (growingTree as any).qa_log?.entries || []
  const meta = growingTree.metadata as any

  const filteredChapters = searchQuery
    ? chapters.filter((ch) => {
        const q = searchQuery.toLowerCase()
        if (ch.title_cn?.toLowerCase().includes(q)) return true
        if (ch.title?.toLowerCase().includes(q)) return true
        if (ch.description?.toLowerCase().includes(q)) return true
        const chLeaves = leaves.filter((l: any) => l.chapter_id === ch.id)
        if (chLeaves.some((l: any) => l.topic?.toLowerCase().includes(q) || l.content?.toLowerCase().includes(q))) return true
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                DWC Ethernet QoS 知识库
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synopsys DesignWare Ethernet QoS Controller v5.10a
              </p>
            </div>
          </div>
          <Link to="/qa" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>智能问答</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="flex gap-6 mb-8 text-sm text-slate-500 dark:text-slate-400">
          <span>{chapters.length} 个章节</span>
          <span>{leaves.length} 个知识点</span>
          <span>{qaLog.length} 次问答</span>
          <span className="ml-auto">v{meta.knowledge_tree_version}</span>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="搜索章节、知识点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-5 text-base bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>

        {/* Chapter Index */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-600" />
            章节索引
          </h2>

          {filteredChapters.map((ch) => {
            const isExpanded = expandedChapters.has(ch.id)
            const chLeaves = leaves.filter((l: any) => l.chapter_id === ch.id)

            return (
              <Card key={ch.id} className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleChapter(ch.id)}>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    {getChapterIcon(ch.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ch.number && <Badge variant="secondary" className="text-xs">第{ch.number}章</Badge>}
                      <span className="text-xs text-slate-400">{statusLabel[ch.status as keyof typeof statusLabel] || ch.status}</span>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{ch.title_cn}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ch.description}</p>
                    <p className="text-xs text-slate-400 mt-1">p.{ch.page_start}–{ch.page_end}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                    {chLeaves.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">包含知识点</p>
                        <div className="flex flex-wrap gap-2">
                          {chLeaves.map((leaf: any) => (
                            <span key={leaf.id} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
                              {leaf.topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link to={`/chapter/${ch.id}`} className="block text-center py-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded transition-colors">
                      查看详情 →
                    </Link>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
