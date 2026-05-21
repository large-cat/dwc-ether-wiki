import { useParams, Link } from 'react-router'
import { ArrowLeft, BookOpen, FileText, Clock, Sprout, CircleDot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import growingTree from '@wiki/growing_knowledge_tree.json'

const statusConfig: Record<string, { color: string; label: string; bg: string; desc: string }> = {
  seeded: { color: 'text-slate-500', label: '已播种', bg: 'bg-slate-50 dark:bg-slate-800/50', desc: '目录信息，从未读过PDF' },
  explored: { color: 'text-blue-600', label: '已探索', bg: 'bg-blue-50 dark:bg-blue-900/20', desc: '已读过PDF内容' },
  growing: { color: 'text-green-600', label: '生长中', bg: 'bg-green-50 dark:bg-green-900/20', desc: '积累了3+知识叶子' },
  mature: { color: 'text-purple-600', label: '成熟', bg: 'bg-purple-50 dark:bg-purple-900/20', desc: '知识充分覆盖' },
}

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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chapter Info */}
        <Card className={`mb-8 border-l-4 ${cfg.bg} ${chapter.status === 'seeded' ? 'border-l-slate-400' : chapter.status === 'explored' ? 'border-l-blue-500' : chapter.status === 'growing' ? 'border-l-green-500' : 'border-l-purple-500'}`}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {chapter.number && <Badge className="bg-blue-600 text-white">第{chapter.number}章</Badge>}
              <Badge className={cfg.color}>{cfg.label}</Badge>
              <Badge variant="outline">p.{chapter.page_start}-{chapter.page_end}</Badge>
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cached Content */}
          <div className="lg:col-span-2 space-y-4">
            {chCacheKeys.length > 0 ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> 已缓存内容
                </h2>
                {chCacheKeys.map((key) => (
                  <Card key={key} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
                    <CardContent className="p-4">
                      <p className="text-xs font-mono text-blue-500 mb-2">{key}</p>
                      <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">{cache[key]}</pre>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700">
                <CardContent className="p-8 text-center">
                  <CircleDot className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">尚未缓存内容</p>
                  <p className="text-xs text-slate-400 mt-1">在Claude Code中提问此章节相关话题，将自动触发PDF读取</p>
                </CardContent>
              </Card>
            )}

            {/* Knowledge Leaves */}
            {chLeaves.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mt-6">
                  <Sprout className="w-5 h-5 text-green-600" /> 知识叶子
                </h2>
                {chLeaves.map((leaf: any) => (
                  <Card key={leaf.id} className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">{leaf.topic}</span>
                        <Badge variant="outline" className="text-[10px]">{leaf.confidence}</Badge>
                        <span className="text-[10px] text-slate-400">{leaf.source}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{leaf.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>{new Date(leaf.created_at).toLocaleDateString('zh-CN')}</span>
                        <span>访问 {leaf.access_count || 0} 次</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QA History */}
            {qaLog.length > 0 && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader><CardTitle className="text-base">相关问答记录</CardTitle></CardHeader>
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

            {/* Stats */}
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-base">统计</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex justify-between"><span>状态</span><span className={cfg.color}>{cfg.label}</span></div>
                <div className="flex justify-between"><span>读取次数</span><span>{chapter.reads_count || 0}</span></div>
                <div className="flex justify-between"><span>知识叶子</span><span>{chLeaves.length}</span></div>
                <div className="flex justify-between"><span>缓存条目</span><span>{chCacheKeys.length}</span></div>
                <div className="flex justify-between"><span>相关问答</span><span>{qaLog.length}</span></div>
              </CardContent>
            </Card>

            {/* Quick Nav */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader><CardTitle className="text-base">导航</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link to="/" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300"><ArrowLeft className="w-4 h-4" /> 返回知识树</Link>
                <Link to="/qa" className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300"><BookOpen className="w-4 h-4" /> 智能问答</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
