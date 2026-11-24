export type Unit = 'g' | 'piece' | 'package' | 'tsp' | 'tbsp'

export const UNITS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'Γραμμάρια' },
  { value: 'piece', label: 'Τεμάχια' },
  { value: 'package', label: 'Συσκευασία' },
  { value: 'tsp', label: 'Κουταλάκι' },
  { value: 'tbsp', label: 'Κουτάλι' },
]

export type Ingredient = { name: string; amount: number; unit: Unit }

// Grocery-aisle grouping for the shopping list — lets it read like an actual
// list ("Vegetables: ...", "Fruits: ...") instead of one flat A-Z dump.
export type GroceryCategory =
  | 'vegetables'
  | 'fruits'
  | 'bakery'
  | 'meat'
  | 'fish'
  | 'deli'
  | 'cheese'
  | 'dairy'
  | 'dairyAlternatives'
  | 'frozen'
  | 'grains'
  | 'legumes'
  | 'oils'
  | 'condiments'
  | 'herbsSpices'
  | 'nuts'
  | 'sweeteners'
  | 'beverages'
  | 'protein'
  | 'other'

// In the order you'd walk a Greek supermarket (fresh produce at the
// entrance, counters, fridges, then the dry aisles), so the shopping list
// follows the route through the store.
export const GROCERY_CATEGORIES: { value: GroceryCategory; label: string }[] = [
  { value: 'vegetables', label: 'Λαχανικά' },
  { value: 'fruits', label: 'Φρούτα' },
  { value: 'bakery', label: 'Αρτοποιείο' },
  { value: 'meat', label: 'Κρεοπωλείο' },
  { value: 'fish', label: 'Ιχθυοπωλείο' },
  { value: 'deli', label: 'Αλλαντικά' },
  { value: 'cheese', label: 'Τυριά' },
  { value: 'dairy', label: 'Γαλακτοκομικά & Αυγά' },
  { value: 'dairyAlternatives', label: 'Φυτικά ροφήματα' },
  { value: 'frozen', label: 'Κατεψυγμένα' },
  { value: 'grains', label: 'Ζυμαρικά, Ρύζι & Αλεύρι' },
  { value: 'legumes', label: 'Όσπρια' },
  { value: 'oils', label: 'Λάδι, Ξίδι & Ελιές' },
  { value: 'condiments', label: 'Κονσέρβες & Σάλτσες' },
  { value: 'herbsSpices', label: 'Μπαχαρικά & Αλάτι' },
  { value: 'nuts', label: 'Ξηροί καρποί' },
  { value: 'sweeteners', label: 'Ζάχαρη, Μέλι & Ζαχαροπλαστική' },
  { value: 'beverages', label: 'Ροφήματα & Ποτά' },
  { value: 'protein', label: 'Συμπληρώματα' },
  { value: 'other', label: 'Άλλα' },
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
  // For things you count rather than weigh ("2 αυγά", "1 κρεμμύδι"): how
  // much one piece weighs, and what a piece is called (singular, plural) —
  // a slice of bread, a clove of garlic. Without a name it's "τεμ.".
  gramsPerPiece?: number
  pieceName?: [string, string]
}

export type Category =
  | 'ladera'
  | 'legumes'
  | 'meat'
  | 'poultry'
  | 'fish'
  | 'pasta'
  | 'pies'
  | 'salads'
  | 'breakfast'
  | 'fruit'
  | 'dessert'

// The way Greek home cooking is usually grouped. color classes are literal
// Tailwind class strings (kept whole, not interpolated) so the CSS build
// can detect them.
export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'ladera', label: 'Λαδερά', color: 'bg-lime-300' },
  { value: 'legumes', label: 'Όσπρια', color: 'bg-amber-300' },
  { value: 'meat', label: 'Κρέας', color: 'bg-main-red' },
  { value: 'poultry', label: 'Πουλερικά', color: 'bg-orange-200' },
  { value: 'fish', label: 'Ψάρι & Θαλασσινά', color: 'bg-main-teal' },
  { value: 'pasta', label: 'Ζυμαρικά & Ρύζι', color: 'bg-main-yellow' },
  { value: 'pies', label: 'Πίτες', color: 'bg-main-orange' },
  { value: 'salads', label: 'Σαλάτες & Μεζέδες', color: 'bg-green-200' },
  { value: 'breakfast', label: 'Πρωινό & Σνακ', color: 'bg-pink-200' },
  { value: 'fruit', label: 'Φρούτα', color: 'bg-rose-300' },
  { value: 'dessert', label: 'Γλυκά', color: 'bg-main-blue' },
]

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Εύκολη' },
  { value: 'medium', label: 'Μέτρια' },
  { value: 'hard', label: 'Δύσκολη' },
]

export type SlotKey = 'breakfast' | 'lunch' | 'afternoon' | 'dinner'

export const SLOT_KEYS: { value: SlotKey; label: string }[] = [
  { value: 'breakfast', label: 'Πρωινό' },
  { value: 'lunch', label: 'Μεσημεριανό' },
  { value: 'afternoon', label: 'Απογευματινό' },
  { value: 'dinner', label: 'Βραδινό' },
]

export type Recipe = {
  id: string
  title: string
  category: Category
  // Which meal(s) this recipe fits — so a plan doesn't suggest, say, pasta
  // for breakfast. Defaults to every slot for older/legacy data.
  mealTypes: SlotKey[]
  // Ingredient amounts are for this many portions (default 1); calories
  // shown anywhere are per portion.
  servings?: number
  // Total time in minutes and how hard it is. Optional: when missing they're
  // estimated from the instructions and ingredients (see recipeTraits.ts).
  minutes?: number
  difficulty?: Difficulty
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
  // Logged with "✓ Ate this" — i.e. exactly the planned meal, so the plan
  // and the log are the same food and shouldn't be shown as two things.
  fromPlan?: boolean
  // "Δεν έφαγα": the meal was skipped on purpose. Zero calories, but it
  // still counts as logged, so the day doesn't look forgotten.
  skipped?: boolean
}

export type Day = {
  label: string
  slots: Record<SlotKey, string[]>
  actual: Partial<Record<SlotKey, ActualEntry>>
  // Extra food eaten with a meal, on top of it (a croissant with breakfast,
  // a dessert after dinner…). Optional so days saved before this existed
  // still load.
  extras?: Partial<Record<SlotKey, ActualEntry[]>>
  // Glasses of water (250 ml each) logged on the Calories page.
  water?: number
}
// startDate is the week's Monday as "YYYY-MM-DD"; label is derived from it
// (e.g. "17–23 Nov") and kept in sync, so anything that just shows a week's
// name can keep using label.
export type Week = { id: string; startDate: string; label: string; days: Day[] }
