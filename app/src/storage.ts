export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // corrupted data or storage unavailable (e.g. private browsing) — ignore
  }
  return fallback
}

export function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — ignore, data just won't persist
  }
}

// v3 = the switch to Greek: new ingredient names, new recipe library. Data
// saved before it points at English ingredients and recipes that no longer
// exist, so it's cleared once (the profile stays, minus excluded
// ingredients, which were English names).
const DATA_VERSION_KEY = 'food-matters-data-version'
const CURRENT_DATA_VERSION = 3
const LEGACY_KEYS = [
  'food-matters-recipes',
  'food-matters-recipes-version',
  'food-matters-ingredient-catalog',
  'food-matters-ingredient-catalog-version',
  'food-matters-weeks',
  'food-matters-shopping',
  'food-matters-fridge',
]

export function resetLegacyData() {
  if (loadFromStorage(DATA_VERSION_KEY, 0) >= CURRENT_DATA_VERSION) return
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
  } catch {
    // storage unavailable — nothing to clear
  }
  const profile = loadFromStorage<Record<string, unknown> | null>('food-matters-profile', null)
  if (profile) saveToStorage('food-matters-profile', { ...profile, excludedIngredients: [] })
  saveToStorage(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
}
