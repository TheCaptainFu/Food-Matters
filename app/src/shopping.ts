import { loadFromStorage, saveToStorage } from './storage'

// Things on the shopping list that don't come from a recipe (milk, kitchen paper…).
export type ExtraItem = { id: string; name: string }

// What's been ticked off and added by hand, per week (keyed by its Monday),
// kept in localStorage so it survives switching tabs or reloading mid-shop.
export type WeekShopping = { checked: string[]; extras: ExtraItem[] }

export const SHOPPING_KEY = 'food-matters-shopping'

export function loadShopping(): Record<string, WeekShopping> {
  return loadFromStorage<Record<string, WeekShopping>>(SHOPPING_KEY, {})
}

export function saveShopping(shopping: Record<string, WeekShopping>) {
  saveToStorage(SHOPPING_KEY, shopping)
}

// Adds names to a week's "Added by you" list (skipping ones already there),
// for other pages to send things to the shopping list. Returns how many
// were actually added.
export function addExtrasToWeek(weekStart: string, names: string[]): number {
  const shopping = loadShopping()
  const week = shopping[weekStart] ?? { checked: [], extras: [] }
  const existing = new Set(week.extras.map((e) => e.name.toLowerCase()))
  const toAdd = names.filter((n) => !existing.has(n.toLowerCase()))
  if (toAdd.length === 0) return 0
  shopping[weekStart] = {
    ...week,
    extras: [...week.extras, ...toAdd.map((name) => ({ id: `extra-${crypto.randomUUID()}`, name }))],
  }
  saveShopping(shopping)
  return toAdd.length
}
