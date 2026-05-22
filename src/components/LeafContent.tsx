import { Fragment, useMemo } from 'react'
import { Info, AlertTriangle, Lightbulb, AlertCircle, HelpCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LeafContentProps {
  leaf: {
    id: string
    topic: string
    content: string
    confidence: string
    source: string
    created_at: string
    access_count: number
    chapter_title?: string
  }
}

/* ────────────────────────────────────────────────────────────────
 *  XML/HTML Semantic Renderer with Markdown Fallback
 * ──────────────────────────────────────────────────────────────── */

function isXmlContent(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.length > 0 && trimmed[0] === '<'
}

function XmlContent({ xml }: { xml: string }): React.ReactElement {
  const nodes = useMemo(() => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<root>${xml}</root>`, 'application/xml')
      const error = doc.querySelector('parsererror')
      if (error) return null
      return renderXmlNodes(doc.documentElement.childNodes)
    } catch {
      return null
    }
  }, [xml])

  if (nodes === null) {
    return <LegacyMarkdownContent content={xml} />
  }
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

    default:
      return <span key={key}>{children}</span>
  }
}

/* ────────────────────────────────────────────────────────────────
 *  Legacy Markdown Parser (fallback for old content)
 * ──────────────────────────────────────────────────────────────── */

interface DocBlock {
  type: 'paragraph' | 'list' | 'table' | 'note' | 'heading'
  content?: string
  items?: string[]
  rows?: { key: string; value: string }[]
  headers?: string[]
  level?: number
}

function parseContent(text: string): DocBlock[] {
  const lines = text.split('\n')
  const blocks: DocBlock[] = []
  let i = 0

  const isHeading = (s: string) => s.match(/^(#{1,3})\s+(.+)$/)
  const isBullet = (s: string) => s.match(/^(\s*)[-*]\s+(.+)$/) || s.match(/^(\s*)[■❑▪•✓✔◦]\s*(.*)$/)
  const isTableRow = (s: string) => s.match(/^\s*\|(.+)\|\s*$/)
  const isTableSep = (s: string) => s.match(/^\s*\|[\s\-:|]+\|\s*$/)
  const isNote = (s: string) => s.match(/^>\s*(.+)$/) || s.match(/^(?:注|注意|Note|提示|Tip)[:：]\s*(.+)$/i)

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (!trimmed) {
      i++
      continue
    }

    const hMatch = isHeading(trimmed)
    if (hMatch) {
      const hashes = hMatch[1].length
      const level = hashes === 1 ? 2 : hashes
      blocks.push({ type: 'heading', content: hMatch[2].trim(), level })
      i++
      continue
    }

    const nMatch = isNote(trimmed)
    if (nMatch) {
      const noteLines = [nMatch[1]]
      let j = i + 1
      while (j < lines.length) {
        const cont = lines[j].trim()
        if (!cont) break
        const cm = isNote(cont)
        if (cm) {
          noteLines.push(cm[1])
          j++
        } else {
          break
        }
      }
      blocks.push({ type: 'note', content: noteLines.join(' ') })
      i = j
      continue
    }

    if (isTableRow(trimmed)) {
      const tableLines: string[] = []
      let j = i
      while (j < lines.length && isTableRow(lines[j].trim())) {
        tableLines.push(lines[j].trim())
        j++
      }
      const dataLines = tableLines.filter((l) => !isTableSep(l))
      if (dataLines.length >= 1) {
        const cells = dataLines.map((l) =>
          l.slice(1, -1).split('|').map((c) => c.trim())
        )
        const colCount = Math.max(...cells.map((r) => r.length))
        if (colCount >= 2) {
          const headers = cells[0]
          const rows = cells.slice(1).map((row) => {
            if (colCount === 2) {
              return { key: row[0] || '', value: row[1] || '' }
            }
            return { key: row[0] || '', value: row.slice(1).join(' | ') }
          })
          blocks.push({ type: 'table', headers, rows })
        }
      }
      i = j
      continue
    }

    const bMatch = isBullet(trimmed)
    if (bMatch) {
      const items: string[] = []
      let k = i
      while (k < lines.length) {
        const line = lines[k]
        const lineTrim = line.trim()
        if (!lineTrim) {
          k++
          continue
        }
        const bm = isBullet(lineTrim)
        if (bm) {
          items.push(bm[2])
          k++
        } else if (items.length > 0 && !isHeading(lineTrim) && !isTableRow(lineTrim) && !isNote(lineTrim)) {
          items[items.length - 1] += ' ' + lineTrim
          k++
        } else {
          break
        }
      }
      if (items.length > 0) {
        blocks.push({ type: 'list', items })
      }
      i = k
      continue
    }

    const kvMatch = trimmed.match(/^([^:]+)\s*[:：]\s*(.+)$/)
    if (kvMatch && kvMatch[1].length < 40 && !kvMatch[1].includes('。') && !kvMatch[1].includes('，')) {
      blocks.push({ type: 'table', rows: [{ key: kvMatch[1].trim(), value: kvMatch[2].trim() }] })
      i++
      continue
    }

    const paraBuf: string[] = [trimmed]
    let p = i + 1
    while (p < lines.length) {
      const next = lines[p].trim()
      if (!next) break
      if (isHeading(next) || isBullet(next) || isTableRow(next) || isNote(next)) break
      if (next.match(/^[^:]+[:：].+$/) && next.split(/[:：]/).length === 2) {
        const lookahead: string[] = []
        let q = p
        while (q < lines.length) {
          const lq = lines[q].trim()
          if (lq.match(/^[^:]+[:：].+$/) && lq.split(/[:：]/).length === 2) {
            lookahead.push(lq)
            q++
          } else if (!lq) {
            break
          } else {
            break
          }
        }
        if (lookahead.length >= 3) break
      }
      paraBuf.push(next)
      p++
    }
    blocks.push({ type: 'paragraph', content: paraBuf.join(' ') })
    i = p
  }

  return blocks
}

function LegacyBlock({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'heading': {
      const level = block.level || 2
      if (level >= 3) {
        return (
          <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2">
            {block.content}
          </h5>
        )
      }
      return (
        <h4 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-3 pb-1 border-b border-slate-200 dark:border-slate-700">
          {block.content}
        </h4>
      )
    }

    case 'paragraph':
      return (
        <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75] my-3">
          {block.content}
        </p>
      )

    case 'list':
      return (
        <ul className="my-3 space-y-1.5 ml-1">
          {block.items?.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75]">
              <span className="mt-2 shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      if (!block.rows || block.rows.length === 0) return null
      if (block.rows.length === 1 && (!block.headers || block.headers.length <= 1)) {
        const r = block.rows[0]
        return (
          <div className="flex gap-3 text-[15px] my-2 py-1">
            <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0 min-w-[120px]">{r.key}：</span>
            <span className="text-slate-600 dark:text-slate-400">{r.value}</span>
          </div>
        )
      }
      return (
        <div className="my-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {(block.headers || ['项目', '说明']).map((h, idx) => (
                  <TableHead key={idx} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-300">{row.key}</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )

    case 'note':
      return (
        <div className="my-4 pl-3 border-l-2 border-amber-400 dark:border-amber-600">
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            {block.content}
          </p>
        </div>
      )

    default:
      return null
  }
}

function LegacyMarkdownContent({ content }: { content: string }) {
  const blocks = parseContent(content)
  return (
    <>
      {blocks.map((block, idx) => (
        <LegacyBlock key={idx} block={block} />
      ))}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────
 *  Main Component
 * ──────────────────────────────────────────────────────────────── */

export default function LeafContent({ leaf }: LeafContentProps) {
  const contentIsXml = isXmlContent(leaf.content)

  return (
    <article className="py-2">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 mb-4 pb-2 border-b border-slate-300 dark:border-slate-600">
        {leaf.topic}
      </h3>
      {contentIsXml ? (
        <XmlContent xml={leaf.content} />
      ) : (
        <LegacyMarkdownContent content={leaf.content} />
      )}
    </article>
  )
}
