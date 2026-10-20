import { Download, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'
import Button from './ui/Button.jsx'
import { downloadCsv, toCsv } from '../lib/csv.js'
import { friendlyError } from '../lib/errors.js'
import { describeRange, reportFilename } from '../lib/reports.js'

const control = `h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm focus:outline-none
  focus:border-[1.5px] focus:border-purple focus:ring-3 focus:ring-purple/15`

/** Search field from Figma "Search Field" — debounced so typing doesn't fire a query per key. */
export function SearchField({ value, onChange, placeholder = 'Search by name or ID' }) {
  const [text, setText] = useState(value ?? '')
  useEffect(() => setText(value ?? ''), [value])
  useEffect(() => {
    const t = setTimeout(() => text !== (value ?? '') && onChange(text), 300)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="relative block min-w-[220px] flex-1 sm:max-w-80">
      <span className="sr-only">Search</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={`${control} pl-10`} />
    </label>
  )
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-[150px] flex-1 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={`${control} cursor-pointer pr-8`}>
        <option value="">{label}: All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

export function DateRange({ from, to, onChange, label = 'Date' }) {
  return (
    <fieldset className="flex min-w-[260px] flex-1 items-center gap-2 sm:flex-none">
      <legend className="sr-only">{label} range</legend>
      <input type="date" aria-label={`${label} from`} value={from ?? ''} max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value || undefined, to })} className={control} />
      <span className="text-muted" aria-hidden>–</span>
      <input type="date" aria-label={`${label} to`} value={to ?? ''} min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value || undefined })} className={control} />
    </fieldset>
  )
}

export function FilterBar({ children, active, onClear }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:px-6">
      {children}
      {active && <Button variant="ghost" size="s" icon={X} onClick={onClear}>Clear filters</Button>}
    </div>
  )
}

/** Exports exactly what the current filters select; RLS guarantees it's only what this user may see. */
export function ExportButton({ kind, filters, fetchRows, columns }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      const rows = await fetchRows(filters)
      if (!rows.length) return toast('info', 'Nothing to export', `No records match these filters (${describeRange(filters)}).`)
      downloadCsv(reportFilename(kind, filters), toCsv(rows, columns))
      toast('success', 'Report exported', `${rows.length} record${rows.length === 1 ? '' : 's'} downloaded.`)
    } catch (e) {
      toast('error', 'Export failed', friendlyError(e))
    } finally {
      setBusy(false)
    }
  }
  return <Button variant="secondary" icon={Download} loading={busy} onClick={go}>Export CSV</Button>
}

/** Filters live in the URL so refresh/back/share keep them. */
export function useUrlFilters(searchParams, setSearchParams, keys) {
  const filters = Object.fromEntries(keys.map((k) => [k, searchParams.get(k) || undefined]))
  const page = Number(searchParams.get('page')) || 1
  // Changing a filter resets to page 1; changing page keeps the filters.
  const update = (patch) => {
    const next = { ...filters, ...patch }
    if (next.page === 1) delete next.page
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])), { replace: true })
  }
  return {
    filters, page,
    set: (patch) => update(patch),
    setPage: (p) => update({ page: p }),
    clear: () => setSearchParams({}, { replace: true }),
    active: keys.some((k) => filters[k]),
  }
}
