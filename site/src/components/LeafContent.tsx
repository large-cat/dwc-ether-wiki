import { Fragment, useMemo, useState, useEffect } from 'react'
import { Info, AlertTriangle, Lightbulb, AlertCircle, HelpCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import FlowChart from '@/components/FlowChart'
import type { Leaf } from '@/types/wiki'

interface LeafContentProps {
  leaf: Leaf
}

/* ────────────────────────────────────────────────────────────────
 *  XML/HTML Semantic Renderer
 * ──────────────────────────────────────────────────────────────── */

function XmlContent({ xml }: { xml: string }): React.ReactElement {
  const nodes = useMemo(() => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<root>${xml}</root>`, 'application/xml')
      const error = doc.querySelector('parsererror')
      if (error) {
        return (
          <div className="my-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
            XML parse error — content may be malformed
          </div>
        )
      }
      return <>{renderXmlNodes(doc.documentElement.childNodes)}</>
    } catch {
      return (
        <div className="my-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          XML parse error — content may be malformed
        </div>
      )
    }
  }, [xml])

  return <>{nodes}</>
}

function renderXmlNodes(nodes: NodeListOf<ChildNode>): React.ReactNode[] {
  const result: React.ReactNode[] = []
  nodes.forEach((node, i) => {
    const r = renderXmlNode(node, i)
    if (r !== null) result.push(r)
  })
  return result
}

function renderXmlNode(node: ChildNode, key: number): React.ReactNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    if (!text.trim()) return null
    return <Fragment key={key}>{text}</Fragment>
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const el = node as Element
  const children = renderXmlNodes(el.childNodes)
  const tag = el.tagName.toLowerCase()

  switch (tag) {
    case 'p':
      return (
        <p key={key} className="text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75] my-3">
          {children}
        </p>
      )

    case 'h': {
      const level = parseInt(el.getAttribute('level') || '2')
      if (level >= 3) {
        return (
          <h5 key={key} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2">
            {children}
          </h5>
        )
      }
      return (
        <h4 key={key} className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-3 pb-1 border-b border-slate-200 dark:border-slate-700">
          {children}
        </h4>
      )
    }

    case 'ul':
      return <ul key={key} className="my-3 space-y-1.5 ml-1">{children}</ul>

    case 'ol':
      return <ol key={key} className="my-3 space-y-1.5 ml-1 list-decimal list-inside">{children}</ol>

    case 'li': {
      const parent = el.parentElement
      if (parent && parent.tagName.toLowerCase() === 'ol') {
        return (
          <li key={key} className="text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75] pl-1">
            {children}
          </li>
        )
      }
      return (
        <li key={key} className="flex items-start gap-2.5 text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75]">
          <span className="mt-2 shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full" />
          <span>{children}</span>
        </li>
      )
    }

    case 'code':
      return (
        <code key={key} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono text-slate-700 dark:text-slate-300">
          {children}
        </code>
      )

    case 'kbd':
      return (
        <kbd key={key} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm font-mono">
          {children}
        </kbd>
      )

    case 'em':
      return <em key={key} className="italic">{children}</em>

    case 'strong':
      return <strong key={key} className="font-semibold">{children}</strong>

    case 'info':
      return (
        <div key={key} className="my-4 pl-3 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 py-2 pr-2 rounded-r">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div>{children}</div>
          </div>
        </div>
      )

    case 'warning':
      return (
        <div key={key} className="my-4 pl-3 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 py-2 pr-2 rounded-r">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>{children}</div>
          </div>
        </div>
      )

    case 'tip':
      return (
        <div key={key} className="my-4 pl-3 border-l-2 border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/10 py-2 pr-2 rounded-r">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <div>{children}</div>
          </div>
        </div>
      )

    case 'important':
      return (
        <div key={key} className="my-4 pl-3 border-l-2 border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10 py-2 pr-2 rounded-r">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>{children}</div>
          </div>
        </div>
      )

    case 'question':
      return (
        <div key={key} className="my-4 pl-3 border-l-2 border-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 py-2 pr-2 rounded-r">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <div>{children}</div>
          </div>
        </div>
      )

    case 'table':
      return (
        <div key={key} className="my-4 overflow-x-auto">
          <Table>{children}</Table>
        </div>
      )

    case 'thead':
      return <TableHeader key={key}>{children}</TableHeader>

    case 'tbody':
      return <TableBody key={key}>{children}</TableBody>

    case 'tr':
      return <TableRow key={key}>{children}</TableRow>

    case 'th':
      return (
        <TableHead key={key} className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {children}
        </TableHead>
      )

    case 'td':
      return (
        <TableCell key={key} className="text-sm text-slate-600 dark:text-slate-400">
          {children}
        </TableCell>
      )

    case 'register': {
      const name = el.getAttribute('name') || ''
      const offset = el.getAttribute('offset') || ''
      const addr = el.getAttribute('addr') || ''
      return (
        <div key={key} className="my-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
            {(offset || addr) && <span className="text-xs font-mono text-slate-400">{offset || addr}</span>}
          </div>
          {children}
        </div>
      )
    }

    case 'field': {
      const name = el.getAttribute('name') || ''
      const bits = el.getAttribute('bits') || ''
      const access = el.getAttribute('access') || ''
      return (
        <div key={key} className="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
          <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[80px]">{name}</span>
          {bits && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-500">{bits}</span>
          )}
          {access && (
            <span className="text-xs px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-slate-500">{access}</span>
          )}
          <span className="text-sm text-slate-600 dark:text-slate-400">{children}</span>
        </div>
      )
    }

    case 'ref': {
      const target = el.getAttribute('target') || ''
      return (
        <a key={key} href={`#${target}`} className="text-blue-600 hover:underline">
          {children}
        </a>
      )
    }

    case 'quote': {
      const source = el.getAttribute('source') || ''
      return (
        <blockquote key={key} className="my-4 pl-4 border-l-2 border-slate-300 dark:border-slate-600 italic text-slate-600 dark:text-slate-400">
          {children}
          {source && <footer className="text-xs text-slate-400 mt-1 not-italic">— {source}</footer>}
        </blockquote>
      )
    }

    case 'signal': {
      const name = el.getAttribute('name') || ''
      const direction = el.getAttribute('direction') || ''
      return (
        <div key={key} className="flex items-center gap-2 py-1">
          <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
          {direction && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{direction}</span>
          )}
          <span className="text-sm text-slate-600 dark:text-slate-400">{children}</span>
        </div>
      )
    }

    case 'diagram': {
      const type = el.getAttribute('type') || 'mermaid'
      const chart = el.textContent || ''
      if (type === 'mermaid' && chart.trim()) {
        return <FlowChart key={key} chart={chart.trim()} className="my-4" />
      }
      return null
    }

    case 'img': {
      const src = el.getAttribute('src') || ''
      const alt = el.getAttribute('alt') || ''
      if (!src) return null
      return (
        <img
          key={key}
          src={`${import.meta.env.BASE_URL}${src}`}
          alt={alt}
          className="my-4 max-w-full rounded-lg border border-slate-200 dark:border-slate-700"
          loading="lazy"
        />
      )
    }

    default:
      return <span key={key}>{children}</span>
  }
}

export default function LeafContent({ leaf }: LeafContentProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const paths = leaf.content_path || []
    Promise.all(
      paths.map(p =>
        fetch(`${import.meta.env.BASE_URL}${p}`)
          .then(r => r.text())
          .catch(() => '')
      )
    )
      .then(texts => {
        setContent(texts.join('\n'))
        setLoading(false)
      })
      .catch(() => {
        setContent('')
        setLoading(false)
      })
  }, [leaf.id])

  return (
    <article className="py-2">
      {loading ? (
        <div className="text-sm text-slate-400">Loading content...</div>
      ) : (
        <XmlContent xml={content} />
      )}
    </article>
  )
}
