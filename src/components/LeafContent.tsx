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
 *  Parse leaf content into document-style blocks: headings,
 *  paragraphs, lists, key-value tables, and callout notes.
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

    if (!trimmed) {
      i++
      continue
    }

    // Heading: starts with ## or is wrapped in **
    if (trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**'))) {
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

    // Table: 3+ consecutive key:value lines
    const tableRegex = /^(.+?)[:：]\s*(.+)$/
    const nextLines: string[] = []
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

    // Single key:value
    const kvMatch = trimmed.match(/^([^:]+)\s*[:：]\s*(.+)$/)
    if (kvMatch && kvMatch[1].length < 40 && !kvMatch[1].includes('。')) {
      blocks.push({ type: 'table', rows: [{ key: kvMatch[1].trim(), value: kvMatch[2].trim() }] })
      i++
      continue
    }

    // Paragraph (collect multi-line)
    const paraBuf: string[] = [trimmed]
    let p = i + 1
    while (p < lines.length) {
      const next = lines[p].trim()
      if (!next) break
      if (next.match(/^[■❑▪•\-\*✓✔◦]/) || next.match(/^(?:注|注意|Note|提示)/i)) break
      if (next.match(/^[^:]+[:：].+$/)) {
        const lookahead: string[] = []
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
      if (block.level === 3) {
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
      if (block.rows.length === 1) {
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
                <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 w-[160px]">项目</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">说明</TableHead>
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

export default function LeafContent({ leaf }: LeafContentProps) {
  const blocks = parseContent(leaf.content)

  return (
    <article className="py-2">
      {/* Title rendered as a paper section heading */}
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 mb-4 pb-2 border-b border-slate-300 dark:border-slate-600">
        {leaf.topic}
      </h3>

      {/* Body content */}
      <div className="pl-0">
        {blocks.map((block, idx) => (
          <Block key={idx} block={block} />
        ))}
      </div>
    </article>
  )
}
