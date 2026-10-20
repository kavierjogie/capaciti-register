// Shown instead of the app when Supabase env vars are missing, so a misconfigured deploy fails loudly.
export default function SetupRequired() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-lg rounded-xl border border-line bg-white p-8 shadow-card">
        <h1 className="mb-2 text-xl font-semibold">Supabase isn't configured</h1>
        <p className="mb-4 text-muted">Set these environment variables, then restart the dev server or redeploy:</p>
        <pre className="rounded-lg bg-bg p-4 text-xs">VITE_SUPABASE_URL=https://&lt;project&gt;.supabase.co{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…</pre>
        <p className="mt-4 text-xs text-muted">See README → “Configure environment variables”.</p>
      </div>
    </main>
  )
}
