// Runs the real migration on PGlite (Postgres in WASM) and exercises RLS + RPCs as each role.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const dir = join(import.meta.dirname, '..')
const MENTOR = '00000000-0000-0000-0000-00000000000a'
const MENTOR2 = '00000000-0000-0000-0000-00000000000b'
const ALICE = '00000000-0000-0000-0000-000000000001'
const BOB = '00000000-0000-0000-0000-000000000002'
const CARL = '00000000-0000-0000-0000-000000000003' // belongs to MENTOR2

let db
async function as(uid, sql, params) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  try {
    return (await db.query(sql, params)).rows
  } finally {
    await db.exec('reset role')
  }
}
const fails = (p, msg) => expect(p).rejects.toThrow(msg)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(join(dir, 'tests/auth-stub.sql'), 'utf8'))
  for (const f of readdirSync(join(dir, 'migrations')).sort())
    await db.exec(readFileSync(join(dir, 'migrations', f), 'utf8'))
  // Users sign up; one tries to smuggle a role through metadata.
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${MENTOR}', 'mentor@example.test', '{"full_name":"Test Mentor"}'),
    ('${MENTOR2}', 'mentor2@example.test', '{"full_name":"Other Mentor"}'),
    ('${ALICE}', 'alice@example.test', '{"full_name":"Alice Test","role":"mentor"}'),
    ('${BOB}', 'bob@example.test', '{"full_name":"Bob Test"}'),
    ('${CARL}', 'carl@example.test', '{"full_name":"Carl Test"}')`)
  // Provisioning as admin (service role / SQL editor in production).
  await db.exec(`update profiles set role = 'mentor' where id in ('${MENTOR}', '${MENTOR2}');
    update profiles set mentor_id = '${MENTOR}' where id in ('${ALICE}', '${BOB}');
    update profiles set mentor_id = '${MENTOR2}' where id = '${CARL}';`)
})

describe('profiles', () => {
  it('signup creates a candidate profile and ignores role in metadata', async () => {
    const [p] = (await db.query(`select role from profiles where id = $1`, [ALICE])).rows
    expect(p.role).toBe('candidate')
  })
  it('candidate can edit name but not role, mentor or identifier', async () => {
    await as(ALICE, `update profiles set full_name = 'Alice T' where id = $1`, [ALICE])
    await fails(as(ALICE, `update profiles set role = 'mentor' where id = $1`, [ALICE]), 'permission denied')
    await fails(as(ALICE, `update profiles set mentor_id = null where id = $1`, [ALICE]), 'permission denied')
    await fails(as(ALICE, `update profiles set candidate_identifier = 'X' where id = $1`, [ALICE]), 'permission denied')
  })
  it('candidate sees self and own mentor only', async () => {
    const rows = await as(ALICE, `select id from profiles order by id`)
    expect(rows.map((r) => r.id).sort()).toEqual([ALICE, MENTOR].sort())
  })
  it('mentor sees own candidates, not other mentors\'', async () => {
    const ids = (await as(MENTOR, `select id from profiles`)).map((r) => r.id)
    expect(ids).toEqual(expect.arrayContaining([ALICE, BOB, MENTOR]))
    expect(ids).not.toContain(CARL)
  })
  it('sensitive profile changes are audited', async () => {
    const rows = (await db.query(`select count(*)::int n from audit_logs where action = 'profile.sensitive_update'`)).rows
    expect(rows[0].n).toBeGreaterThan(0)
  })
})

describe('attendance', () => {
  it('check-out before check-in is rejected', async () => {
    await fails(as(BOB, `select check_out()`), 'Check in before checking out')
  })
  it('check-in works once per day, with server timestamps', async () => {
    const [r] = await as(ALICE, `select * from check_in('wfh', 'Home – Mitchells Plain')`)
    expect(r.candidate_id).toBe(ALICE)
    expect(r.check_out_at).toBeNull()
    await fails(as(ALICE, `select check_in('office')`), 'already checked in')
  })
  it('check-out works once', async () => {
    const [r] = await as(ALICE, `select * from check_out()`)
    expect(r.check_out_at).not.toBeNull()
    await fails(as(ALICE, `select check_out()`), 'already checked out')
  })
  it('candidates cannot write attendance directly', async () => {
    await fails(as(ALICE, `insert into attendance_records (candidate_id, attendance_date, work_mode, check_in_at)
      values ($1, current_date - 1, 'office', now())`, [BOB]), 'permission denied')
    await fails(as(ALICE, `update attendance_records set check_in_at = now() - interval '3 hours'`), 'permission denied')
    await fails(as(ALICE, `delete from attendance_records`), 'permission denied')
  })
  it('mentors cannot check in', async () => {
    await fails(as(MENTOR, `select check_in('office')`), 'Only active candidates')
  })
  it('visibility: own rows, assigned mentor only', async () => {
    await as(BOB, `select check_in('office')`)
    expect((await as(ALICE, `select candidate_id from attendance_overview`)).map((r) => r.candidate_id)).toEqual([ALICE])
    expect((await as(MENTOR, `select candidate_id from attendance_overview`)).length).toBe(2)
    expect((await as(MENTOR2, `select candidate_id from attendance_overview`)).length).toBe(0)
  })
})

describe('WFH workflow', () => {
  let reqId, weekday
  beforeAll(async () => {
    ;[{ d: weekday }] = (await db.query(`select d::date::text d from generate_series(sast_today() + 1, sast_today() + 7, '1 day') d
      where extract(isodow from d) < 6 limit 1`)).rows
  })
  it('candidate submits; duplicates, past and weekend dates are rejected', async () => {
    const [r] = await as(ALICE, `select * from submit_wfh_request($1::date, 'Transport disruption', 'Taxi strike')`, [weekday])
    expect(r.status).toBe('pending')
    reqId = r.id
    await fails(as(ALICE, `select submit_wfh_request($1::date, 'Other', 'again please')`, [weekday]), 'already have a pending')
    await fails(as(ALICE, `select submit_wfh_request(sast_today() - 1, 'Other', 'yesterday!')`), 'today or a future date')
    const [{ sat }] = (await db.query(`select d::date::text sat from generate_series(sast_today() + 1, sast_today() + 7, '1 day') d
      where extract(isodow from d) = 6 limit 1`)).rows
    await fails(as(ALICE, `select submit_wfh_request($1::date, 'Other', 'weekend')`, [sat]), 'weekdays only')
    await fails(as(ALICE, `select submit_wfh_request($1::date, 'Bored', null)`, [weekday]), 'check constraint')
  })
  it('mentor got a notification', async () => {
    expect((await as(MENTOR, `select title from notifications`))[0].title).toBe('New WFH request')
  })
  it('candidates and unassigned mentors cannot decide', async () => {
    await fails(as(ALICE, `select decide_wfh_request($1, 'approved')`, [reqId]), 'not assigned to you')
    await fails(as(MENTOR2, `select decide_wfh_request($1, 'approved')`, [reqId]), 'not assigned to you')
    await fails(as(ALICE, `update wfh_requests set status = 'approved'`), 'permission denied')
  })
  it('rejection requires a comment', async () => {
    await fails(as(MENTOR, `select decide_wfh_request($1, 'rejected', '')`, [reqId]), 'reason is required')
  })
  it('mentor approves once; second decision cannot overwrite', async () => {
    const [r] = await as(MENTOR, `select * from decide_wfh_request($1, 'approved', 'Fine')`, [reqId])
    expect(r.status).toBe('approved')
    expect(r.reviewed_by).toBe(MENTOR)
    await fails(as(MENTOR, `select decide_wfh_request($1, 'rejected', 'changed my mind')`, [reqId]), 'already been decided')
  })
  it('candidate sees decision, reviewer name and notification', async () => {
    const [r] = await as(ALICE, `select status, reviewer_name from wfh_overview where id = $1`, [reqId])
    expect(r).toEqual({ status: 'approved', reviewer_name: 'Test Mentor' })
    expect((await as(ALICE, `select title from notifications`))[0].title).toBe('WFH request approved')
  })
  it('audit trail is written and read-only', async () => {
    const rows = await as(MENTOR, `select action from audit_logs where entity_id = $1 order by id`, [reqId])
    expect(rows.map((r) => r.action)).toEqual(['wfh.submitted', 'wfh.approved'])
    await fails(as(MENTOR, `delete from audit_logs`), 'permission denied')
    await fails(as(MENTOR, `update audit_logs set action = 'x'`), 'permission denied')
  })
  it('a rejected date can be requested again', async () => {
    const [{ id }] = await as(BOB, `select (submit_wfh_request($1::date, 'Medical appointment')).id`, [weekday])
    await as(MENTOR, `select decide_wfh_request($1, 'rejected', 'Team day in office')`, [id])
    const [r] = await as(BOB, `select (submit_wfh_request($1::date, 'Other', 'Contractor visiting')).status`, [weekday])
    expect(r.status).toBe('pending')
  })
})

describe('anonymous', () => {
  it('sees nothing and can call nothing', async () => {
    await fails(as(null, `select * from profiles`), 'permission denied')
    await fails(as(null, `select * from wfh_overview`), 'permission denied')
    await fails(as(null, `select check_in('office')`), 'permission denied')
  })
})
