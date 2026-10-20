import { isLate, sastToday } from './time.js'

/**
 * Status shown in the "Register" column. Never invents absences: days without a row simply aren't listed.
 * A record with no check-out is "Checked in" today and "No check-out" on any past day.
 */
export function registerStatus(row, today = sastToday()) {
  if (!row.check_out_at) {
    return row.attendance_date < today ? { tone: 'missing', label: 'No check-out' } : { tone: 'working', label: 'Checked in' }
  }
  return isLate(row.check_in_at) ? { tone: 'late', label: 'Late' } : { tone: 'submitted', label: 'Submitted' }
}

export const sumHours = (rows) => Math.round(rows.reduce((t, r) => t + (Number(r.hours) || 0), 0) * 10) / 10
