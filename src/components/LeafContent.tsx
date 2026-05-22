import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  defaultOpen?: boolean
}

/* ────────────────────────────────────────────────────────────────
 *  Parse leaf content into document-style blocks: paragraphs,
 *  lists, key-value tables, and callout notes.
 * ──────────────────────────────────────────────────────────────── */

interface DocBlock {
  type: 'paragraph' | 'list' | 'table' | 'note' | 'heading'
  content?: string
  items?: string[]
  rows?: { key: string; value: string }[]
  level?: number
}

function parseContent(text: string): DocBlock[] {
  const lines = text.split('\n')
  const blocks: DocBlock[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // Empty line -> skip
    if (!trimmed) {
      i++
      continue
    }

    // Heading-like: starts with ## or is short + bold feel
    if (trimmed.startsWith('##') || trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const level = trimmed.startsWith('###') ? 3 : trimmed.startsWith('##') ? 2 : 2
      const text = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      blocks.push({ type: 'heading', content: text, level })
      i++
      continue
    }

    // Note / callout
    const noteMatch = trimmed.match(/^(?:注|注意|Note|提示|Tip|⚠️|❗)[:：]\s*(.+)/i)
    if (noteMatch) {
      blocks.push({ type: 'note', content: noteMatch[1] })
      i++
      continue
    }

    // Table-like: lines with multiple | or clear tabular structure
    const tableRegex = /^(.+?)[:：]\s*(.+)$/
    const nextLines = []
    let j = i
    while (j < lines.length && lines[j].trim()) {
      const l = lines[j].trim()
      if (l.match(tableRegex) && l.split(/[:：]/).length === 2) {
        nextLines.push(l)
        j++
      } else {
        break
      }
    }
    if (nextLines.length >= 3) {
      // Treat consecutive key:value lines as a table
      const rows = nextLines.map((l) => {
        const m = l.match(/^(.+?)[:：]\s*(.+)$/)
        return m ? { key: m[1].trim(), value: m[2].trim() } : { key: l, value: '' }
      })
      blocks.push({ type: 'table', rows })
      i = j
      continue
    }

    // List items
    const bulletMatch = trimmed.match(/^[■❑▪•\-\*✓✔◦]\s*(.*)/)
    if (bulletMatch) {
      const items: string[] = []
      let k = i
      while (k < lines.length) {
        const bl = lines[k].trim()
        const bm = bl.match(/^[■❑▪•\-\*✓✔◦]\s*(.*)/)
        if (bm) {
          items.push(bm[1])
          k++
        } else if (bl && items.length > 0) {
          // continuation line
          items[items.length - 1] += ' ' + bl
          k++
        } else {
          break
        }
      }
      blocks.push({ type: 'list', items })
      i = k
      continue
    }

    // Single key:value → description list (rendered inline)
    const kvMatch = trimmed.match(/^([^:]+)\s*[:：]\s*(.+)$/)
    if (kvMatch && kvMatch[1].length < 40 && !kvMatch[1].includes('。')) {
      blocks.push({ type: 'table', rows: [{ key: kvMatch[1].trim(), value: kvMatch[2].trim() }] })
      i++
      continue
    }

    // Regular paragraph (collect multi-line)
    const paraBuf: string[] = [trimmed]
    let p = i + 1
    while (p < lines.length) {
      const next = lines[p].trim()
      if (!next) break
      // Stop if next line looks like a special block
      if (next.match(/^[■❑▪•\-\*✓✔◦]/) || next.match(/^(?:注|注意|Note|提示)/i)) break
      if (next.match(/^[^:]+[:：].+$/)) {
        // Might be key:value, check if it's alone or part of table
        const lookahead = []
        let q = p
        while (q < lines.length && lines[q].trim().match(/^[^:]+[:：].+$/)) {
          lookahead.push(lines[q].trim())
          q++
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

/* ── Render a single block ── */
function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">
          {block.content}
        </h4>
      )

    case 'paragraph':
      return (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
          {block.content}
        </p>
      )

    case 'list':
      return (
        <ul className="my-2 space-y-1">
          {block.items?.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="mt-1.5 shrink-0 w-1 h-1 bg-slate-400 rounded-full" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      if (!block.rows || block.rows.length === 0) return null
      if (block.rows.length === 1) {
        // Single row → inline description
        const r = block.rows[0]
        return (
          <div className="flex gap-2 text-sm my-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0 min-w-[100px]">{r.key}：</span>
            <span className="text-slate-600 dark:text-slate-400">{r.value}</span>
          </div>
        )
      }
      // Multiple rows → proper table
      return (
        <div className="my-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium text-slate-600 dark:text-slate-400 w-[140px]">项目</TableHead>
                <TableHead className="text-xs font-medium text-slate-600 dark:text-slate-400">说明</TableHead>
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
        <div className="my-3 pl-3 border-l-2 border-amber-400 dark:border-amber-600">
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            {block.content}
          </p>
        </div>
      )

    default:
      return null
  }
}

export default function LeafContent({ leaf, defaultOpen = true }: LeafContentProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const blocks = parseContent(leaf.content)

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 py-3 text-left group"
      >
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {leaf.topic}
        </h3>
      </button>

      {isOpen && (
        <div className="pb-4 pl-7">
          {blocks.map((block, idx) => (
            <Block key={idx} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}
