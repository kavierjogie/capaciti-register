import { addDays, isWeekend, sastToday } from './time.js'

export const WFH_REASONS = ['Transport disruption', 'Medical appointment', 'Family responsibility', 'Home internet installation', 'Other']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateLogin({ email, password }) {
  const e = {}
  if (!email?.trim()) e.email = 'Email is required'
  else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address'
  if (!password) e.password = 'Password is required'
  return e
}

export function validateNewPassword({ password, confirm }) {
  const e = {}
  if (!password || password.length < 8) e.password = 'Use at least 8 characters'
  if (password !== confirm) e.confirm = 'Passwords do not match'
  return e
}

// Mirrors submit_wfh_request() so users see problems before the round trip; the database still decides.
export function validateWfh({ date, reason, details }, today = sastToday()) {
  const e = {}
  if (!date) e.date = 'Choose a date'
  else if (date < today) e.date = 'Choose today or a future date'
  else if (date > addDays(today, 90)) e.date = 'Requests can be made up to 90 days ahead'
  else if (isWeekend(date)) e.date = 'WFH requests are for weekdays only'
  if (!WFH_REASONS.includes(reason)) e.reason = 'Select a reason'
  if (reason === 'Other' && (details ?? '').trim().length < 5) e.details = 'Tell your Tech Champion a bit more (5+ characters)'
  if ((details ?? '').length > 1000) e.details = 'Keep this under 1000 characters'
  return e
}

export function validateProfile({ full_name, phone }) {
  const e = {}
  const n = (full_name ?? '').trim()
  if (n.length < 2 || n.length > 120) e.full_name = 'Enter your full name'
  if (phone && !/^[0-9 +()-]{7,20}$/.test(phone)) e.phone = 'Enter a valid phone number'
  return e
}

export function validateRejection(comment) {
  return (comment ?? '').trim().length < 3 ? 'A reason is required when rejecting' : null
}
