import { describe, expect, it } from 'vitest'
import { registerStatus, sumHours } from './attendance.js'
import { toCsv } from './csv.js'
import { ATTENDANCE_COLUMNS, reportFilename, WFH_COLUMNS } from './reports.js'
import { addDays, formatTime, hoursBetween, isWeekend, monthBounds, sastToday, weekStart } from './time.js'
import { validateLogin, validateProfile, validateRejection, validateWfh } from './validation.js'

describe('time (Africa/Johannesburg)', () => {
  it('uses SAST for today regardless of UTC date', () => {
    expect(sastToday(new Date('2026-10-19T22:30:00Z'))).toBe('2026-10-20') // 00:30 SAST
    expect(sastToday(new Date('2026-10-20T21:59:00Z'))).toBe('2026-10-20') // 23:59 SAST
  })
  it('formats times in SAST', () => expect(formatTime('2026-10-20T06:02:00Z')).toBe('08:02'))
  it('date helpers', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekStart('2026-10-22')).toBe('2026-10-19') // Thu → Mon
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // Sun → Mon
    expect(isWeekend('2026-10-24')).toBe(true)
    expect(isWeekend('2026-10-23')).toBe(false)
    expect(hoursBetween('2026-10-20T06:00:00Z', '2026-10-20T14:36:00Z')).toBe(8.6)
    expect(hoursBetween('2026-10-20T06:00:00Z', null)).toBeNull()
    expect(monthBounds('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthBounds('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
})

describe('registerStatus', () => {
  const today = '2026-10-20'
  it('open record today is "Checked in", on a past day "No check-out"', () => {
    expect(registerStatus({ attendance_date: today, check_in_at: '2026-10-20T06:00:00Z' }, today).label).toBe('Checked in')
    expect(registerStatus({ attendance_date: '2026-10-19', check_in_at: '2026-10-19T06:00:00Z' }, today).label).toBe('No check-out')
  })
  it('late only after the display threshold', () => {
    const row = (t) => ({ attendance_date: today, check_in_at: t, check_out_at: '2026-10-20T14:00:00Z' })
    expect(registerStatus(row('2026-10-20T06:30:00Z'), today).label).toBe('Submitted') // 08:30
    expect(registerStatus(row('2026-10-20T06:41:00Z'), today).label).toBe('Late') // 08:41
  })
  it('sums hours ignoring open records', () => expect(sumHours([{ hours: 8.6 }, { hours: null }, { hours: '7.4' }])).toBe(16))
})

describe('validation', () => {
  const today = '2026-10-20' // Tuesday
  it('WFH: accepts a valid weekday request', () => {
    expect(validateWfh({ date: '2026-10-21', reason: 'Medical appointment' }, today)).toEqual({})
  })
  it('WFH: rejects past, weekend, far-future, bad reason, thin "Other"', () => {
    expect(validateWfh({ date: '2026-10-19', reason: 'Other', details: 'Plumber' }, today).date).toMatch(/today or a future/)
    expect(validateWfh({ date: '2026-10-24', reason: 'Other', details: 'Plumber' }, today).date).toMatch(/weekdays/)
    expect(validateWfh({ date: '2027-03-01', reason: 'Other', details: 'Plumber' }, today).date).toMatch(/90 days/)
    expect(validateWfh({ date: '2026-10-21', reason: 'Bored' }, today).reason).toBeTruthy()
    expect(validateWfh({ date: '2026-10-21', reason: 'Other', details: 'x' }, today).details).toBeTruthy()
    expect(validateWfh({ date: '', reason: '' }, today)).toHaveProperty('date')
  })
  it('login + profile + rejection', () => {
    expect(validateLogin({ email: 'nope', password: '' })).toEqual({ email: 'Enter a valid email address', password: 'Password is required' })
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({})
    expect(validateProfile({ full_name: 'A', phone: 'abc' })).toHaveProperty('phone')
    expect(validateProfile({ full_name: 'Lerato Dlamini', phone: '+27 82 123 4567' })).toEqual({})
    expect(validateRejection('  ')).toBeTruthy()
    expect(validateRejection('Office day')).toBeNull()
  })
})

describe('CSV reports', () => {
  it('escapes quotes/commas/newlines and neutralises formulas', () => {
    const csv = toCsv([{ a: 'x, "y"', b: '=SUM(A1)', c: 'line\nbreak' }],
      [{ header: 'A', value: (r) => r.a }, { header: 'B', value: (r) => r.b }, { header: 'C', value: (r) => r.c }])
    expect(csv).toBe('A,B,C\r\n"x, ""y""",\'=SUM(A1),"line\nbreak"')
  })
  it('attendance report has the expected columns and values', () => {
    const csv = toCsv([{ full_name: 'Lerato Dlamini', candidate_identifier: 'CAP-1', attendance_date: '2026-10-20',
      check_in_at: '2026-10-20T06:02:00Z', check_out_at: '2026-10-20T14:32:00Z', hours: 8.5, work_mode: 'wfh', wfh_approved: true }],
    ATTENDANCE_COLUMNS).split('\r\n')
    expect(csv[0]).toBe('Candidate name,Candidate ID,Cohort,Date,Check-in time,Check-out time,Working hours,Work mode,WFH approved,Attendance status,Location')
    expect(csv[1]).toBe('Lerato Dlamini,CAP-1,,2026-10-20,08:02,16:32,8.50,Working From Home,Yes,Submitted,')
  })
  it('WFH report includes decision columns', () => {
    expect(WFH_COLUMNS.map((c) => c.header)).toEqual(expect.arrayContaining(['WFH status', 'Decision date', 'Decision-maker']))
  })
  it('filenames carry the range', () => {
    expect(reportFilename('attendance', { from: '2026-10-01', to: '2026-10-31' })).toBe('capaciti-attendance_2026-10-01_to_2026-10-31.csv')
    expect(reportFilename('wfh')).toBe('capaciti-wfh.csv')
  })
})
