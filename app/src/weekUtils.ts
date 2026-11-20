import type { Day, Week } from './types'

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Dates are stored as local "YYYY-MM-DD" strings (never via toISOString,
// which is UTC and can shift the day near midnight).
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7))
}

export function todayISO(): string {
  return toISODate(new Date())
}

function shortDate(date: Date, withMonth: boolean): string {
  return withMonth
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : String(date.getDate())
}

// Greek month abbreviations for week names — a fixed list rather than
// toLocaleDateString('el-GR'), whose short forms differ between browsers.
const GREEK_MONTHS = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']

// "16–22 Νοε", or "30 Νοε – 6 Δεκ" when the week spans two months.
export function weekLabel(startDate: string): string {
  const start = parseISODate(startDate)
  const end = addDays(start, 6)
  const startMonth = GREEK_MONTHS[start.getMonth()]
  const endMonth = GREEK_MONTHS[end.getMonth()]
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${endMonth}`
    : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
}

// The calendar date of a week's Nth day (0 = Monday).
export function dayDate(week: Week, dayIndex: number): Date {
  return addDays(parseISODate(week.startDate), dayIndex)
}

export function formatDayDate(date: Date): string {
  return shortDate(date, true)
}

// Which week (and which day in it) a date falls on — null if no week covers it.
export function findDay(weeks: Week[], iso: string): { week: Week; dayIndex: number } | null {
  const target = parseISODate(iso).getTime()
  for (const week of weeks) {
    const start = parseISODate(week.startDate).getTime()
    const dayIndex = Math.round((target - start) / 86_400_000)
    if (dayIndex >= 0 && dayIndex < 7) return { week, dayIndex }
  }
  return null
}

export function sortWeeks(weeks: Week[]): Week[] {
  return [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function makeDay(label: string): Day {
  return {
    label,
    slots: { breakfast: [], lunch: [], afternoon: [], dinner: [] },
    actual: {},
  }
}

export function makeWeek(startDate: string, days: Day[] = DAY_LABELS.map(makeDay)): Week {
  return {
    id: crypto.randomUUID(),
    startDate,
    label: weekLabel(startDate),
    days,
  }
}
