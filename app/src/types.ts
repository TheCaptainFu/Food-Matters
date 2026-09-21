export type Unit = 'g' | 'package' | 'tsp' | 'tbsp'

export const UNITS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'Grams' },
  { value: 'package', label: 'Package' },
  { value: 'tsp', label: 'Teaspoon' },
  { value: 'tbsp', label: 'Tablespoon' },
]

export type Ingredient = { name: string; amount: number; unit: Unit }

// Grocery-aisle grouping for the shopping list — lets it read like an actual
// list ("Vegetables: ...", "Fruits: ...") instead of one flat A-Z dump.
export type GroceryCategory =
  | 'vegetables'
  | 'fruits'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'dairyAlternatives'
  | 'grains'
  | 'legumes'
  | 'nuts'
  | 'oils'
  | 'condiments'
  | 'sweeteners'
  | 'herbsSpices'
  | 'beverages'
  | 'protein'
  | 'other'

export const GROCERY_CATEGORIES: { value: GroceryCategory; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'meat', label: 'Meat & Poultry' },
  { value: 'fish', label: 'Fish & Seafood' },
  { value: 'dairy', label: 'Dairy & Eggs' },
  { value: 'dairyAlternatives', label: 'Dairy Alternatives' },
  { value: 'grains', label: 'Grains & Starches' },
  { value: 'legumes', label: 'Legumes' },
  { value: 'nuts', label: 'Nuts & Seeds' },
  { value: 'oils', label: 'Oils & Fats' },
  { value: 'condiments', label: 'Condiments & Sauces' },
  { value: 'sweeteners', label: 'Sweeteners & Baking' },
  { value: 'herbsSpices', label: 'Herbs & Spices' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'protein', label: 'Protein Supplements' },
  { value: 'other', label: 'Other' },
]

// The ingredient catalog is user data (like recipes/weeks) — picked from a
// <select> so the same ingredient always has the exact same spelling and
// correctly sums up across recipes, but it's editable/extendable at runtime,
// not a fixed list baked into the app. It ships with a seeded list of ~150
// common ingredients as a starting point, but every field is user-editable
// and the user can add, edit or delete any entry.
export type IngredientDef = {
  name: string
  category: GroceryCategory
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
  // How to actually make it — optional so older/legacy recipes without one
  // just don't show a "how to make it" section instead of breaking.
  instructions?: string
}
// What you actually ate for a slot, when it differs from (or confirms) the
// plan — logged separately so the plan itself stays untouched and day
// totals can be recalculated from what really happened.
export type ActualEntry = {
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  // A resized/compressed data URL, kept small enough for localStorage.
  photo?: string
}

export type Day = {
  label: string
  slots: Record<SlotKey, string[]>
  actual: Partial<Record<SlotKey, ActualEntry>>
}
export type Week = { id: string; label: string; days: Day[] }
