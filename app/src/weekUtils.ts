import type { Day, SlotKey, Week } from './types'

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

// demo data: pre-fills Week 1 with the sample recipes so the calendar
// doesn't look empty on first load. A slot can list more than one recipe id
// to show that a slot can hold multiple dishes.
const SAMPLE_PLAN: Partial<Record<SlotKey, string[]>>[] = [
  { breakfast: ['seed-4'], lunch: ['seed-1', 'seed-8'], dinner: ['seed-2'] }, // Monday
  { breakfast: ['seed-10'], lunch: ['seed-8'], dinner: ['seed-3'] }, // Tuesday
  { breakfast: ['seed-5'], lunch: ['seed-9'], dinner: ['seed-7', 'seed-6', 'seed-9'] }, // Wednesday
  { breakfast: ['seed-4'], lunch: ['seed-6'], dinner: ['seed-2'] }, // Thursday
  { breakfast: ['seed-10', 'seed-5'], lunch: ['seed-1'], dinner: ['seed-3'] }, // Friday
  { breakfast: ['seed-5'], lunch: ['seed-8'], dinner: ['seed-7'] }, // Saturday
  { breakfast: ['seed-4'], lunch: ['seed-9'], dinner: ['seed-6'] }, // Sunday
]

export function makeSeededWeek(label: string): Week {
  const week = makeWeek(label)
  const slotKeys: SlotKey[] = ['breakfast', 'lunch', 'afternoon', 'dinner']
  week.days.forEach((day, i) => {
    const plan = SAMPLE_PLAN[i]
    slotKeys.forEach((key) => {
      const recipeIds = plan[key]
      if (recipeIds) day.slots[key] = recipeIds
    })
  })
  return week
}
