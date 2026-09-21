import type { Day, Week } from './types'

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function makeDay(label: string): Day {
  return {
    label,
    slots: { breakfast: [], lunch: [], afternoon: [], dinner: [] },
  }
}

export function makeWeek(label: string): Week {
  return {
    id: crypto.randomUUID(),
    label,
    days: DAY_LABELS.map(makeDay),
  }
}
