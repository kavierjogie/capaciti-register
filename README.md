# CAPACITI Online Register & WFH

Daily attendance register and work-from-home (WFH) approvals for CAPACITI candidates and Tech Champions.
React 19 + Vite (JavaScript) · Tailwind CSS 4 · React Router · Lucide · Supabase (Auth, Postgres, RLS) · Vercel.

UI follows the Figma file *Tech-Geeks_Online-Register-WFH_Capaciti* (tokens, Poppins type scale, sidebar,
buttons, inputs, badges, stat cards, modal, table, alerts).

---

## What it does

**Candidates** sign in, check in (Office / Working From Home + self-reported location) and check out once per day,
see today's status, weekly hours and history, submit WFH requests, track decisions and comments, edit their name/phone,
and export their own records as CSV.

**Tech Champions** see only their assigned candidates: a dashboard (assigned candidates, pending/approved/rejected
counts, today's register showing who hasn't checked in or out), a pending queue, a review modal to **approve or reject
with a required comment**, searchable/filterable attendance and WFH lists with pagination, CSV exports, and
candidate invitations.

Both roles get in-app notifications (request submitted → Tech Champion; decision → candidate).

---

## Security model

The browser only ever holds the **publishable** key. Every rule is enforced in Postgres; hiding a button is UX, not security.

| Layer | What it enforces |
|---|---|
| **Row Level Security** on all 5 tables | Candidates read only their own rows; Tech Champions read only rows of candidates whose `mentor_id` is them; candidates can read their own Tech Champion's name. Anonymous users get nothing. |
| **Column-level grants** | Users may update only `profiles.full_name`, `profiles.phone` and `notifications.read_at`. `role`, `mentor_id`, `status`, `cohort`, `candidate_identifier` are not writable from the client at all. No client `insert`/`update`/`delete` on attendance, WFH or audit tables. |
| **`SECURITY DEFINER` RPCs** | `check_in`, `check_out`, `submit_wfh_request`, `decide_wfh_request` use `auth.uid()` (never a client-supplied ID) and `now()` (never the browser clock). |
| **Atomic decisions** | `decide_wfh_request` updates `WHERE status = 'pending' AND is_my_candidate(...)` — a second decision can't overwrite the first, and only the assigned Tech Champion can decide. Rejection requires a comment (also a CHECK constraint). |
| **Constraints** | One attendance row per candidate per day; check-out after check-in; one pending/approved WFH request per date; status/decision consistency. |
| **Audit trail** | WFH submissions and decisions, invitations, and any change to role/assignment/status/cohort/ID (via trigger, whoever makes it). Read-only to users. |
| **Signup** | New auth users always get a `candidate` profile; role in signup metadata is ignored. Public signup should be **disabled** (see setup). |
| **Secret key** | Used only in `api/invite-candidate.js`, which first verifies the caller's JWT and that they're an active Tech Champion. Never `VITE_`-prefixed. |

Adding an **admin** role later: `alter type app_role add value 'admin'` and extend `current_role_is`/`is_my_candidate`
plus the select policies — no table changes needed.

---

## Setup

### 1. Supabase project
1. Create a project at [supabase.com](https://supabase.com) (region close to Cape Town, e.g. `eu-west`/`af-south` if available).
2. **Apply the migration** — either:
   - SQL editor: paste and run `supabase/migrations/20261020000000_init.sql`, or
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. **Authentication → Sign In / Providers**: keep Email enabled, **turn off “Allow new users to sign up”** (accounts are invitation-only).
4. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL and add redirect URLs
   `http://localhost:5173/reset-password` and `https://<your-app>.vercel.app/reset-password`.
5. *(Recommended)* Configure custom SMTP under Authentication → Emails; the built-in sender is heavily rate-limited.

### 2. First Tech Champion
Dashboard → Authentication → Users → **Invite user** with their email, then run the first snippet in
`supabase/provisioning.sql` to promote them to `mentor`. They set their password from the invite email.

### 3. Candidates
Tech Champions invite candidates in the app (**Candidates → Invite candidate**). The candidate is created with role
`candidate`, assigned to that Tech Champion, and emailed a link to set a password. Manual assignment, moving a
candidate, or deactivating an account: see `supabase/provisioning.sql`.

### 4. Environment variables
Copy `.env.example` to `.env.local`:

| Variable | Where | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | `sb_publishable_…` (legacy anon key also works as `VITE_SUPABASE_ANON_KEY`) |
| `SUPABASE_URL` | server only | Project URL |
| `SUPABASE_SECRET_KEY` | server only | `sb_secret_…` (or legacy `service_role` as `SUPABASE_SERVICE_ROLE_KEY`) |

The app shows a “Supabase isn't configured” screen if the browser variables are missing.

### 5. Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```
`/api/invite-candidate` is a Vercel function; to use invitations locally run `npx vercel dev` instead of `npm run dev`.

---

## Testing

```bash
npm test             # all 33 tests
npm run test:db      # database only
npm run lint
npm run build
```

- **`supabase/tests/rls.test.js` (20 tests)** runs the real migration on **PGlite** (Postgres compiled to WASM) with a
  minimal stand-in for Supabase's `auth` schema, then acts as each role. It covers: role can't be smuggled through
  signup metadata; candidates can't change role/mentor/ID; profile visibility per role; check-in once, check-out once,
  no check-out before check-in; no direct writes to attendance/WFH/audit; mentors can't check in; candidates and
  *unassigned* mentors can't decide; rejection needs a comment; second decision is refused; rejected dates can be
  re-requested; notifications and audit rows are written; anonymous access is denied.
- **`src/lib/lib.test.js` (13 tests)** covers SAST date handling across midnight, the register-status rules, WFH/login/
  profile validation, CSV escaping (including spreadsheet-formula neutralising) and report columns.

**Not yet automated:** browser end-to-end tests against a live Supabase project (needs credentials). After deploying,
walk through *Manual acceptance checks* below with one Tech Champion and two candidates (one assigned to someone else).

### Manual acceptance checks
1. Signed out, open `/candidate` → redirected to sign-in. Sign in as candidate → lands on `/candidate`; as Tech Champion → `/mentor`. Candidate visiting `/mentor` → “You don't have access”.
2. Candidate: check in → refresh → still checked in; check in again from another tab → “already checked in”; check out → hours shown.
3. Candidate: submit WFH for a weekday → Tech Champion sees badge count + notification → reject without comment (blocked) → reject with comment → candidate sees “Rejected” + comment after refresh.
4. Open the same pending request in two Tech Champion tabs, approve in one, reject in the other → “already been decided”.
5. Export CSV with a date range on each role; confirm only permitted rows appear.
6. With a candidate's session in a scratch supabase-js script (publishable key + `signInWithPassword`): `from('wfh_requests').update({ status: 'approved' })` and `rpc('decide_wfh_request', …)` must both fail, and `from('attendance_records').select()` must return only their own rows.

---

## Deploy to Vercel

1. Push to GitHub: `git add . && git commit -m "CAPACITI register" && git branch -M main && git remote add origin <repo-url> && git push -u origin main`.
2. Vercel → **Add New → Project** → import the repo. Framework preset **Vite** is detected (`vercel.json` also pins build command `npm run build` and output `dist`).
3. **Environment Variables** (Production + Preview): the four variables from step 4 above.
4. Deploy. `vercel.json` rewrites every non-`/api` path to `index.html`, so refreshing deep links works.
5. Add the production URL to Supabase **Site URL** and **Redirect URLs** (`…/reset-password`).
6. Smoke-test: sign in, password reset email, invite a candidate, check in/out, submit/decide a WFH request, export CSV.

---

## Design decisions and things to confirm with CAPACITI

- **Late** is a display-only badge for check-ins after **08:30** (`LATE_AFTER` in `src/lib/time.js`). Nothing is blocked. Confirm the real cut-off.
- **No absences are invented.** Days without a register entry aren't marked absent; the Tech Champion dashboard shows who *hasn't checked in today*. A formal absence/attendance-rate policy (working days, public holidays) needs CAPACITI's rules first — so the Figma “Attendance Rate” card is shown as **Days Registered** this month instead.
- **WFH without approval** is allowed at check-in but flagged (“No approval”) to the Tech Champion and in exports, rather than blocked.
- **WFH rules enforced**: weekdays only, today up to 90 days ahead, one pending/approved request per date. Single-day requests; date ranges can be added with an `end_date` column later.
- **Leave** (in the Figma attendance-status dropdown) isn't implemented: it needs its own request/approval flow.
- **Location** is self-reported text and is not treated as proof of where someone is.
- **Missed check-out**: the day shows “No check-out”, hours stay blank. There's no correction flow yet; corrections can be made by an admin in SQL and are visible in the record.
- Dates and times display in **Africa/Johannesburg**; the database stores `timestamptz` and decides “today” in SAST.

## Schema (differences from the brief's suggestions)

`profiles`, `attendance_records`, `wfh_requests`, `audit_logs` as suggested, plus:
- `attendance_records.work_mode` (`office`/`wfh`), `location_note`, `notes` — the Figma shows status and location per day.
- `wfh_requests.details` alongside `reason` (Figma's reason dropdown + free text; `Other` needs details).
- `notifications` table for decision/submission notices.
- Views `attendance_overview` and `wfh_overview` (`security_invoker`, so RLS applies) add names, hours and approval flags for search, filtering and export.

## Project structure

```
api/invite-candidate.js        Vercel function (secret key, mentor-only)
supabase/migrations/           schema, RLS, grants, RPCs, views
supabase/tests/                PGlite RLS/RPC tests + auth stub
supabase/provisioning.sql      admin snippets
src/api/                       data access (one module per resource)
src/auth/                      session/profile context, role guard
src/components/ui/             Figma components: Button, Badge, Card, Field, Modal, Table, Avatar, Feedback
src/components/                layout, filters/export, attendance & WFH tables, review modal, toasts
src/lib/                       time (SAST), validation, CSV/report columns, error messages
src/pages/                     auth, candidate/*, mentor/*, profile, status pages
```

## Known limitations
- Logos are 1× exports from Figma (200×40); replace `src/assets/logo-*.png` and `public/logo-mark.png` with the original artwork for sharper rendering on high-DPI screens.
- Only the Cover and Components pages of the Figma file were available; screens not shown there (sign-in, history, Tech Champion pages) were designed from those components.
- Notifications refresh on navigation (no Realtime).
- No PDF reports (CSV only).
