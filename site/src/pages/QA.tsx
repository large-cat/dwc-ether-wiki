import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { Send, BookOpen, ArrowLeft, Bot, User, Sparkles, ThumbsUp, ThumbsDown, Copy, Check, Sprout, TreePine, CircleDot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import growingTree from '@wiki/growing_knowledge_tree.json'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  relatedChapters?: string[]
  relatedLeaves?: any[]
  pdfWasRead?: boolean
  timestamp: Date
}

function findBestAnswer(question: string): {
  answer: string
  chapters: string[]
  leaves: any[]
  pdfWasRead: boolean
} {
  const q = question.toLowerCase()
  const cache = (growingTree as any).cache?.entries || {}
  const leaves = (growingTree as any).leaves?.entries || []

  // 1. Search knowledge leaves FIRST (fastest path)
  const matchedLeaves: any[] = []
  for (const leaf of leaves) {
    const leafText = `${leaf.topic} ${leaf.content}`.toLowerCase()
    let score = 0
    for (const word of q.split(/[\s,，。?？!！]+/)) {
      if (word.length > 1 && leafText.includes(word)) score += 2
    }
    if (score > 0 || leafText.includes(q)) {
      matchedLeaves.push({ ...leaf, relevance: score })
    }
  }
  matchedLeaves.sort((a, b) => b.relevance - a.relevance)

  if (matchedLeaves.length > 0) {
    let answer = ''
    for (const leaf of matchedLeaves.slice(0, 3)) {
      answer += `**${leaf.topic}**\n${leaf.content}\n\n`
    }
    return {
      answer: answer.trim(),
      chapters: [...new Set(matchedLeaves.slice(0, 3).map((l: any) => l.chapter_id))],
      leaves: matchedLeaves.slice(0, 3),
      pdfWasRead: false // Used cached leaves
    }
  }

  // 2. Search cached content
  const matchedChapters: string[] = []
  for (const ch of growingTree.chapters) {
    const chCacheKeys = Object.keys(cache).filter((k) => k.startsWith(ch.id + '_'))
    if (chCacheKeys.length > 0) {
      const searchText = `${ch.title_cn} ${ch.title} ${ch.description}`.toLowerCase()
      const cacheText = chCacheKeys.map((k) => cache[k]).join(' ').toLowerCase()
      const fullText = searchText + ' ' + cacheText

      let score = 0
      for (const word of q.split(/[\s,，。?？!！]+/)) {
        if (word.length > 1 && fullText.includes(word)) score += 1
      }
      if (score > 0 || fullText.includes(q)) {
        matchedChapters.push(ch.id)
      }
    }
  }

  if (matchedChapters.length > 0) {
    const ch = growingTree.chapters.find((c: any) => c.id === matchedChapters[0])
    return {
      answer: `关于"${ch?.title_cn || ''}"的相关内容已在知识树缓存中。\n\n${ch?.description || ''}\n\n如需更详细的回答，请在Claude Code中使用 \`/load CLAUDE.md\` 加载知识引擎进行深度问答。`,
      chapters: matchedChapters,
      leaves: [],
      pdfWasRead: false
    }
  }

  // 3. Search chapter titles
  for (const ch of growingTree.chapters) {
    if (q.includes(ch.title_cn?.toLowerCase()) || q.includes(ch.title?.toLowerCase())) {
      return {
        answer: `关于"${ch.title_cn}" (${ch.title}):\n\n${ch.description}\n\n该章节位于页码 ${ch.page_start}-${ch.page_end}。\n\n**此章节尚未被探索** - 在Claude Code中提问此话题，会自动读取PDF内容并生长知识叶子。`,
        chapters: [ch.id],
        leaves: [],
        pdfWasRead: false
      }
    }
  }

  return {
    answer: `这是一个关于DWC_ether_qos的好问题。当前知识树中暂无相关内容。\n\n**建议操作：**\n1. 在Claude Code中使用 \`/load CLAUDE.md\` 加载知识引擎\n2. 提问将自动触发PDF按需读取\n3. 新学到的知识会保存为知识叶子，知识树持续生长\n\n也可以尝试使用更具体的关键词，如：RGMII、TSO、1588、描述符、EST等。`,
    chapters: [],
    leaves: [],
    pdfWasRead: false
  }
}

const suggestedQuestions = [
  'RGMII接口有什么特点？',
  '什么是TSO（TCP Segmentation Offload）？',
  'DWC_ether_qos支持哪些PHY接口？',
  '1588时间戳一步法和两步法有什么区别？',
  '什么是增强调度流量EST？',
  '帧抢占(Frame Preemption)是什么？',
  'DMA控制器支持多少个通道？',
  '描述符的OWN位是怎么工作的？',
  '如何初始化DWC_ether_qos？',
  '数据包过滤的流程是什么？',
]

export default function QA() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const meta = growingTree.metadata as any

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages])

  const handleSend = async (question?: string) => {
    const q = question || input.trim()
    if (!q || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: q, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 600))
    const result = findBestAnswer(q)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.answer,
      relatedChapters: result.chapters,
      relatedLeaves: result.leaves,
      pdfWasRead: result.pdfWasRead,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getChapterName = (id: string) => {
    const ch = (growingTree.chapters as any[]).find((c: any) => c.id === id)
    return ch ? `${ch.title_cn}` : id
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">智能问答助手</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sprout className="w-3 h-3" /> 懒加载知识树 · {meta.total_reads_from_pdf} 次PDF读取
              </p>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <TreePine className="w-4 h-4" /><span>知识树</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl mb-6">
                <Sparkles className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">DWC以太网QoS知识问答</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                基于懒加载知识树的智能问答。知识叶子优先回答，未探索章节标记为待生长。
              </p>
              <p className="text-xs text-slate-400 mb-8">
                深度问答请在Claude Code中使用 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/load CLAUDE.md</code>
              </p>
              <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)}
                    className="text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{q}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    <Card className={msg.role === 'user' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}>
                      <CardContent className="p-4">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>

                        {/* Knowledge Leaves Badge */}
                        {msg.relatedLeaves && msg.relatedLeaves.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                              <Sprout className="w-3 h-3" /> 来自知识叶子（缓存命中，未读PDF）
                            </p>
                            <div className="space-y-1">
                              {msg.relatedLeaves.slice(0, 3).map((leaf: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                  <Sprout className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400">{leaf.topic}</span>
                                    <span className="text-xs text-slate-400 ml-2">{leaf.confidence}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unexplored hint */}
                        {msg.pdfWasRead === false && (!msg.relatedLeaves || msg.relatedLeaves.length === 0) && msg.relatedChapters && msg.relatedChapters.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <CircleDot className="w-3 h-3" /> 此章节尚未探索。在Claude Code中提问可触发PDF读取并生长知识。
                            </p>
                          </div>
                        )}

                        {/* Related Chapters */}
                        {msg.relatedChapters && msg.relatedChapters.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">相关章节:</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.relatedChapters.map((chId) => (
                                <Link key={chId} to={`/chapter/${chId}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                  <BookOpen className="w-3 h-3" />{getChapterName(chId)}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-2">
                        <button onClick={() => copyMessage(msg.id, msg.content)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors" title="复制">
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors" title="有用"><ThumbsUp className="w-3.5 h-3.5 text-slate-400" /></button>
                        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors" title="无用"><ThumbsDown className="w-3.5 h-3.5 text-slate-400" /></button>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center order-2">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3">
            <Input placeholder="输入问题..." value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" disabled={isLoading} />
            <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 px-4">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
            <CircleDot className="w-3 h-3" /> 懒加载模式 · 知识叶子优先 · 未命中时建议用Claude Code深度问答
          </p>
        </div>
      </div>
    </div>
  )
}
