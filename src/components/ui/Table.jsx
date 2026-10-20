import { ChevronLeft, ChevronRight } from 'lucide-react'

// Figma "Table": label-caps headers on muted background, 56px rows. Scrolls horizontally on small screens.
export function Table({ columns, rows, rowKey = 'id', onRowClick, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-bg">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={`label-caps h-11 px-4 first:pl-6 ${c.className ?? ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r[rowKey]}
              className={`h-14 border-t border-line ${onRowClick ? 'cursor-pointer hover:bg-bg focus-within:bg-bg' : ''}`}
              onClick={onRowClick && (() => onRowClick(r))}
            >
              {columns.map((c) => <td key={c.key} className={`px-4 py-2 first:pl-6 ${c.className ?? ''}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-6 py-3 text-xs text-muted" aria-label="Pagination">
      <span>{from}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2 hover:bg-bg disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2">Page {page} of {pages}</span>
        <button className="rounded-lg p-2 hover:bg-bg disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}
