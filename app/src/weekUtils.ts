import type { ActualEntry, Day, SlotKey, Week } from './types'
import { SLOT_KEYS } from './types'

export const DAY_LABELS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή']

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

// Greek month abbreviations — a fixed list rather than
// toLocaleDateString('el-GR'), whose short forms differ between browsers.
const GREEK_MONTHS = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']

function shortDate(date: Date, withMonth: boolean): string {
  return withMonth ? `${date.getDate()} ${GREEK_MONTHS[date.getMonth()]}` : String(date.getDate())
}

// Greek weekday name for a date ("Δευτέρα"), same order as DAY_LABELS.
export function weekdayName(date: Date): string {
  return DAY_LABELS[(date.getDay() + 6) % 7]
}

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

// Extras were briefly one flat list per day (before they belonged to a
// meal), and an early conversion could leave such entries under keys that
// aren't meals ("0", "1"…). Anything not filed under a meal is shown under
// dinner, so every extra that's counted is also visible and deletable.
function extrasBySlot(day: Day): Partial<Record<SlotKey, ActualEntry[]>> {
  const raw = day.extras as unknown
  if (!raw) return {}
  if (Array.isArray(raw)) return { dinner: raw as ActualEntry[] }

  const slotKeys = new Set<string>(SLOT_KEYS.map((s) => s.value))
  const result: Partial<Record<SlotKey, ActualEntry[]>> = {}
  const stray: ActualEntry[] = []
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const entries = (Array.isArray(value) ? value : value ? [value] : []) as ActualEntry[]
    if (slotKeys.has(key) && Array.isArray(value)) result[key as SlotKey] = entries
    else stray.push(...entries)
  })
  if (stray.length > 0) result.dinner = [...(result.dinner ?? []), ...stray]
  return result
}

// The extra food logged with one meal.
export function slotExtras(day: Day, slot: SlotKey): ActualEntry[] {
  return extrasBySlot(day)[slot] ?? []
}

// Every extra logged that day, across all meals.
export function allExtras(day: Day): ActualEntry[] {
  return Object.values(extrasBySlot(day)).flatMap((list) => list ?? [])
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

// Applies a change to one day (by date), creating that day's week if
// nobody has planned it yet — e.g. logging water on an unplanned day.
export function updateDayInWeeks(weeks: Week[], iso: string, change: (day: Day) => Day): Week[] {
  const ref = findDay(weeks, iso)
  if (ref) {
    return weeks.map((week) =>
      week.id !== ref.week.id
        ? week
        : { ...week, days: week.days.map((day, i) => (i === ref.dayIndex ? change(day) : day)) },
    )
  }
  const startDate = toISODate(mondayOf(parseISODate(iso)))
  const week = makeWeek(startDate)
  const dayIndex = Math.round((parseISODate(iso).getTime() - parseISODate(startDate).getTime()) / 86_400_000)
  week.days = week.days.map((day, i) => (i === dayIndex ? change(day) : day))
  return sortWeeks([...weeks, week])
}

// A meal skipped on purpose ("Δεν έφαγα").
export function skippedEntry(): ActualEntry {
  return { description: 'Δεν έφαγα', calories: 0, protein: 0, carbs: 0, fat: 0, skipped: true }
}

// A planned meal in a slot is a recipe id, optionally with how many
// portions: "42" (one) or "42@1.5". Kept in the id string so moving,
// copying or undoing a meal carries its portion along for free.
export function parseSlotEntry(entry: string): { id: string; portion: number } {
  const at = entry.lastIndexOf('@')
  if (at < 0) return { id: entry, portion: 1 }
  const portion = Number(entry.slice(at + 1))
  return { id: entry.slice(0, at), portion: portion > 0 ? portion : 1 }
}

export function slotEntry(id: string, portion = 1): string {
  return portion === 1 ? id : `${id}@${portion}`
}

// "1½ μερίδα", "2 μερίδες" — empty for a normal single portion.
export function portionLabel(portion: number): string {
  if (portion === 1) return ''
  const whole = Math.floor(portion)
  const text = portion - whole === 0.5 ? (whole > 0 ? `${whole}½` : '½') : String(portion)
  return `${text} ${portion >= 2 ? 'μερίδες' : 'μερίδα'}`
}
