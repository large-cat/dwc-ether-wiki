import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { BookOpen, Search, Layers, Cpu, Zap, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Chapter, ChapterLeavesConfig, Leaf } from '@/types/wiki'

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
  const [tree, setTree] = useState<{ chapters: Chapter[]; metadata: any } | null>(null)
  const [allLeaves, setAllLeaves] = useState<Leaf[]>([])

  // Stage 1: Load tree (chapters metadata only)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}growing_knowledge_tree.json`)
      .then(r => r.json())
      .then(data => {
        setTree(data)
      })
      .catch(() => {})
  }, [])

  // Stage 2: Load all chapter leaf configs in parallel
  useEffect(() => {
    if (!tree) return

    const configs = tree.chapters
      .map((ch: Chapter) => ch.leaves_config)
      .filter(Boolean)

    Promise.all(
      configs.map((configPath: string) =>
        fetch(`${import.meta.env.BASE_URL}${configPath}`)
          .then(r => r.json())
          .then((config: ChapterLeavesConfig) => config.leaves || [])
          .catch(() => [])
      )
    )
      .then((results: Leaf[][]) => {
        const merged = results.flat()
        setAllLeaves(merged)
      })
      .catch(() => {})
  }, [tree])

  const chapters = tree?.chapters || []
  const meta = tree?.metadata || {}

  const filteredChapters = searchQuery
    ? chapters.filter((ch: Chapter) => {
        const q = searchQuery.toLowerCase()
        if (ch.title_cn?.toLowerCase().includes(q)) return true
        if (ch.title?.toLowerCase().includes(q)) return true
        if (ch.description?.toLowerCase().includes(q)) return true
        const chLeaves = allLeaves.filter((l: Leaf) => l.id.startsWith(`leaf_${ch.id}_`))
        if (chLeaves.some((l: Leaf) => l.topic?.toLowerCase().includes(q))) return true
        return false
      })
    : chapters

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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="flex gap-6 mb-8 text-sm text-slate-500 dark:text-slate-400">
          <span>{chapters.length} 个章节</span>
          <span>{allLeaves.length} 个知识点</span>
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

          {filteredChapters.map((ch: Chapter) => {
            const chLeaves = allLeaves.filter((l: Leaf) => l.id.startsWith(`leaf_${ch.id}_`))

            return (
              <Link
                key={ch.id}
                to={`/chapter/${ch.id}`}
                className="block p-3 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors border-b border-slate-200 dark:border-slate-800 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 mt-0.5">
                    {getChapterIcon(ch.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ch.number && <Badge variant="secondary" className="text-xs">第{ch.number}章</Badge>}
                      <span className="text-xs text-slate-400">{statusLabel[ch.status as keyof typeof statusLabel] || ch.status}</span>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{ch.title_cn}</h3>
                      <span className="text-xs text-slate-400 ml-auto">p.{ch.page_start}–{ch.page_end}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{ch.description}</p>
                    {chLeaves.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {chLeaves.map((leaf: Leaf) => (
                          <span key={leaf.id} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] text-slate-600 dark:text-slate-400">
                            {leaf.topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
