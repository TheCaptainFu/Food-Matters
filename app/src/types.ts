export type Unit = 'g' | 'package' | 'tsp' | 'tbsp'

export const UNITS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'Grams' },
  { value: 'package', label: 'Package' },
  { value: 'tsp', label: 'Teaspoon' },
  { value: 'tbsp', label: 'Tablespoon' },
]

export type Ingredient = { name: string; amount: number; unit: Unit }

// The ingredient catalog is user data (like recipes/weeks) — picked from a
// <select> so the same ingredient always has the exact same spelling and
// correctly sums up across recipes, but it's editable/extendable at runtime,
// not a fixed list baked into the app. It ships with a seeded list of ~150
// common ingredients as a starting point, but every field is user-editable
// and the user can add, edit or delete any entry.
export type IngredientDef = {
  name: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

export type Category = 'pasta' | 'meat' | 'fish' | 'vegetarian' | 'dessert'

// color classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them
export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'pasta', label: 'Pasta', color: 'bg-main-yellow' },
  { value: 'meat', label: 'Meat', color: 'bg-main-red' },
  { value: 'fish', label: 'Fish', color: 'bg-main-teal' },
  { value: 'vegetarian', label: 'Vegetarian', color: 'bg-main-orange' },
  { value: 'dessert', label: 'Dessert', color: 'bg-main-blue' },
]

export type SlotKey = 'breakfast' | 'lunch' | 'afternoon' | 'dinner'

export const SLOT_KEYS: { value: SlotKey; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'dinner', label: 'Dinner' },
]

export type Recipe = {
  id: string
  title: string
  category: Category
  // Which meal(s) this recipe fits — so a plan doesn't suggest, say, pasta
  // for breakfast. Defaults to every slot for older/legacy data.
  mealTypes: SlotKey[]
  ingredients: Ingredient[]
}
export type Day = { label: string; slots: Record<SlotKey, string[]> }
export type Week = { id: string; label: string; days: Day[] }
