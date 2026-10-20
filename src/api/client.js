import { supabase } from '../lib/supabase.js'

/** Unwrap a Supabase response, throwing its error so callers can use try/catch. */
export async function run(query) {
  const { data, error, count } = await query
  if (error) throw error
  return count == null ? data : { data, count }
}

export const db = () => supabase

/** Fetch every row for exports, 1000 at a time (PostgREST's default page cap). */
export async function fetchAll(buildQuery) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const page = await run(buildQuery().range(from, from + 999))
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

/** PostgREST `or` filter values must not contain its own syntax characters. */
export const searchTerm = (s) => s.trim().replace(/[,()*%\\]/g, ' ').slice(0, 60)
