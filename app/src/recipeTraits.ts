import type { Category, Difficulty, GroceryCategory, IngredientDef, Recipe } from './types'
import { isRecipeFasting } from './dietaryRestrictions'
import { recipeMacros, type Macros } from './nutrition'
import { findDef, toGrams } from './quantities'
import { loadFromStorage, saveToStorage } from './storage'

// Rough per-recipe traits for planning a week the way people actually
// decide: how much it costs and how long it takes. Both are estimates —
// good enough to tell a φασολάδα from a σολομός, not to the cent.

// Typical Greek supermarket prices, € per kg.
const PRICE_PER_KG: Record<GroceryCategory, number> = {
  vegetables: 2,
  fruits: 2.5,
  bakery: 3.5,
  meat: 9,
  fish: 13,
  deli: 14,
  cheese: 12,
  dairy: 3,
  dairyAlternatives: 2.5,
  frozen: 5,
  grains: 2.2,
  legumes: 3.5,
  oils: 9,
  condiments: 4,
  herbsSpices: 20,
  nuts: 16,
  sweeteners: 4,
  beverages: 3,
  protein: 30,
  other: 5,
}

// Ingredients far from their aisle's average.
const PRICE_OVERRIDES: Record<string, number> = {
  'Στήθος κοτόπουλο': 8,
  'Μπούτι κοτόπουλο': 5,
  'Κοτόπουλο ολόκληρο': 4.5,
  'Φτερούγες κοτόπουλο': 5,
  'Αρνί μπούτι': 15,
  'Αρνίσια παϊδάκια': 19,
  'Κατσικάκι': 15,
  'Μοσχαρίσια μπριζόλα': 20,
  'Μοσχάρι κατσαρόλας': 13,
  'Χοιρινό λαιμός': 7.5,
  'Χοιρινή μπριζόλα': 7,
  'Σολομός φιλέτο': 24,
  'Γαρίδες': 18,
  'Χταπόδι': 18,
  'Καλαμάρι': 12,
  'Σουπιά': 11,
  'Γαύρος': 7,
  'Σκουμπρί': 5,
  'Τσιπούρα': 10,
  'Λαβράκι': 10,
  'Γλώσσα φιλέτο': 11,
  'Σαρδέλες': 6,
  'Μύδια': 6,
  'Μπακαλιάρος παστός': 16,
  'Αυγά': 5,
  'Γάλα πλήρες': 1.4,
  'Γάλα ελαφρύ': 1.4,
  'Ελαιόλαδο': 10,
  'Κουκουνάρι': 60,
  'Φιστίκια Αιγίνης': 30,
}

export function costPerServing(recipe: Recipe, catalog: IngredientDef[]): number {
  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
  const total = recipe.ingredients.reduce((sum, ing) => {
    const def = findDef(ing.name, catalog)
    const perKg = PRICE_OVERRIDES[def?.name ?? ing.name] ?? PRICE_PER_KG[def?.category ?? 'other']
    return sum + (toGrams(ing.amount, ing.unit, def) / 1000) * perKg
  }, 0)
  return total / servings
}

export type CostTier = 'cheap' | 'mid' | 'pricey'

export function costTier(recipe: Recipe, catalog: IngredientDef[]): CostTier {
  const cost = costPerServing(recipe, catalog)
  return cost < 2 ? 'cheap' : cost < 4 ? 'mid' : 'pricey'
}

// Cooking time from the instructions ("40 λεπτά", "1 ώρα και 15 λεπτά",
// "2 ώρες"); soaking overnight or for a day isn't hands-on time and is left
// out. Without any time mentioned, a guess by kind of dish.
const DEFAULT_MINUTES: Record<Category, number> = {
  ladera: 50,
  legumes: 60,
  meat: 60,
  poultry: 50,
  fish: 25,
  pasta: 25,
  pies: 70,
  salads: 10,
  eggs: 15,
  breakfast: 5,
  fruit: 5,
  dessert: 40,
  coffee: 0,
  street: 0,
  bakery: 0,
  taverna: 0,
  soft: 0,
  sweets: 0,
  snacks: 0,
  drinks: 0,
}

export function estimateMinutes(recipe: Recipe): number {
  if (recipe.minutes && recipe.minutes > 0) return recipe.minutes
  const text = recipe.instructions ?? ''
  let minutes = 0
  for (const m of text.matchAll(/(\d+(?:,\d+)?)\s*(ώρ|λεπτ)/g)) {
    const value = Number(m[1].replace(',', '.'))
    const inMinutes = m[2] === 'ώρ' ? value * 60 : value
    if (inMinutes < 12 * 60) minutes += inMinutes
  }
  if (minutes === 0) return DEFAULT_MINUTES[recipe.category] ?? 30
  return Math.round(minutes + 10) // + prep
}

// How hard: from the time, the number of ingredients, and techniques that
// take practice (phyllo, béchamel, frying, avgolemono).
const TRICKY = /φύλλ|μπεσαμέλ|τηγάνισ|αυγολέμον|κουρκούτι|ζύμωσ|σιρόπι|τύλιξε/i

export function estimateDifficulty(recipe: Recipe): Difficulty {
  if (recipe.difficulty) return recipe.difficulty
  const minutes = estimateMinutes(recipe)
  const many = recipe.ingredients.length >= 9
  const tricky = TRICKY.test(recipe.instructions ?? '')
  if (tricky && many && minutes >= 50) return 'hard'
  if (tricky || many || minutes >= 45) return 'medium'
  return 'easy'
}

// How many days it keeps in the fridge — what "cook once, eat twice" relies
// on. Stews and oven dishes keep; fried, grilled and fresh things don't.
export function keepsDays(recipe: Recipe): number {
  if (recipe.keepsDays && recipe.keepsDays > 0) return recipe.keepsDays
  const text = recipe.instructions ?? ''
  if (['salads', 'breakfast', 'fruit', 'eggs'].includes(recipe.category)) return 1
  if (/τηγάνισ|σχάρα|καυτό λάδι/i.test(text) && !/σιγόβρασ|κατσαρόλα/i.test(text)) return 1
  if (['ladera', 'legumes', 'pies'].includes(recipe.category)) return 3
  if (/σιγόβρασ|φούρνο|ταψί|κατσαρόλα|ψυγείο/i.test(text)) return 3
  return recipe.category === 'dessert' ? 1 : 2
}

// Season from the ingredients: summer vegetables and fruit vs. winter ones.
const SUMMER = ['Κολοκυθάκια', 'Μελιτζάνα', 'Μπάμιες', 'Φασολάκια', 'Καρπούζι', 'Πεπόνι', 'Ροδάκινο', 'Σύκα', 'Κεράσια', 'Βερίκοκα', 'Πιπεριά πράσινη']
const WINTER = ['Λάχανο', 'Πράσο', 'Σέλινο', 'Κουνουπίδι', 'Μπρόκολο', 'Πορτοκάλι', 'Μανταρίνι', 'Γλυκοπατάτα', 'Κολοκύθα', 'Ρόδι', 'Τραχανάς']

export type Season = 'summer' | 'winter' | null

export function recipeSeason(recipe: Recipe): Season {
  const names = recipe.ingredients.map((i) => i.name)
  const summer = names.filter((n) => SUMMER.includes(n)).length
  const winter = names.filter((n) => WINTER.includes(n)).length
  // Soups and legume stews are winter food even without winter vegetables.
  const cosy = recipe.category === 'legumes' || /σούπα|κοτόσουπα/i.test(recipe.title)
  if (summer >= 1 && summer > winter) return 'summer'
  if (winter >= 1 || cosy) return 'winter'
  return null
}

// Everything worth showing about a recipe at a glance, in one place.
export type RecipeInfo = {
  macros: Macros
  minutes: number
  difficulty: Difficulty
  cost: number
  costTier: CostTier
  keepsDays: number
  season: Season
  fasting: boolean
}

export function recipeInfo(recipe: Recipe, catalog: IngredientDef[]): RecipeInfo {
  const cost = costPerServing(recipe, catalog)
  return {
    macros: recipeMacros(recipe, catalog),
    minutes: estimateMinutes(recipe),
    difficulty: estimateDifficulty(recipe),
    cost,
    costTier: cost < 2 ? 'cheap' : cost < 4 ? 'mid' : 'pricey',
    keepsDays: keepsDays(recipe),
    season: recipeSeason(recipe),
    fasting: isRecipeFasting(recipe),
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}'`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} ώρ.` : `${h} ώρ. ${m}'`
}

export function formatEuro(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}€`
}

export const COST_LABEL: Record<CostTier, string> = { cheap: '€', mid: '€€', pricey: '€€€' }

// ---------------------------------------------------------------------------
// What the "plan my week" questions are answered with — remembered, so the
// next week starts from last week's answers.
// ---------------------------------------------------------------------------

export type PlanPrefs = {
  budget: 'low' | 'normal' | 'any'
  time: 'quick' | 'normal' | 'love'
  likes: Category[]
  cookTwice: boolean
}

const PREFS_KEY = 'food-matters-plan-prefs'

export const DEFAULT_PLAN_PREFS: PlanPrefs = { budget: 'normal', time: 'normal', likes: [], cookTwice: false }

export function loadPlanPrefs(): PlanPrefs {
  return { ...DEFAULT_PLAN_PREFS, ...loadFromStorage<Partial<PlanPrefs>>(PREFS_KEY, {}) }
}

export function savePlanPrefs(prefs: PlanPrefs) {
  saveToStorage(PREFS_KEY, prefs)
}

// Extra cost added to a recipe's score when picking for a day (lower is
// better), on the same scale as the macro distance it's added to.
export function prefsPenalty(recipe: Recipe, catalog: IngredientDef[], prefs: PlanPrefs, isWeekday: boolean): number {
  let penalty = 0
  const tier = costTier(recipe, catalog)
  if (prefs.budget === 'low') penalty += tier === 'pricey' ? 1.2 : tier === 'mid' ? 0.35 : 0
  else if (prefs.budget === 'normal') penalty += tier === 'pricey' ? 0.4 : 0

  const minutes = estimateMinutes(recipe)
  if (prefs.time === 'quick' && isWeekday) penalty += minutes > 45 ? 1.2 : minutes > 30 ? 0.4 : 0
  else if (prefs.time === 'normal' && isWeekday) penalty += minutes > 90 ? 0.6 : 0

  if (prefs.likes.includes(recipe.category)) penalty -= 0.35
  return penalty
}
