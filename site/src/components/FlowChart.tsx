import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { Loader2, AlertCircle } from 'lucide-react'

interface FlowChartProps {
  chart: string
  className?: string
}

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#dbeafe',
      primaryTextColor: '#1e3a5f',
      primaryBorderColor: '#3b82f6',
      lineColor: '#64748b',
      secondaryColor: '#f0fdf4',
      tertiaryColor: '#fef3c7',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '14px',
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
      padding: 16,
    },
    sequence: {
      useMaxWidth: true,
      boxMargin: 8,
      boxTextMargin: 4,
    },
  })
  mermaidInitialized = true
}

export default function FlowChart({ chart, className = '' }: FlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    initMermaid()
    let cancelled = false

    async function render() {
      setLoading(true)
      setError('')
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (!cancelled) {
          setSvg(renderedSvg)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || '渲染失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
        <span className="text-sm text-slate-500">正在渲染流程图...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/30 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>流程图渲染失败</span>
        </div>
        <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
