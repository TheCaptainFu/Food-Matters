import type { Ingredient, IngredientDef, Recipe, Unit } from './types'
import type { DietType } from './dietaryRestrictions'

// Rough gram equivalents for non-gram units, used only for the calorie estimate.
function gramsFor(amount: number, unit: Unit): number {
  switch (unit) {
    case 'g':
      return amount
    case 'tsp':
      return amount * 5
    case 'tbsp':
      return amount * 15
    case 'package':
      return amount * 100
  }
}

export type Macros = { calories: number; protein: number; carbs: number; fat: number }

// Nutrition values come from the user's own ingredient catalog — an
// ingredient with no catalog entry simply contributes 0.

export function estimateMacros(ingredient: Ingredient, catalog: IngredientDef[]): Macros {
  const def = catalog.find((c) => c.name === ingredient.name)
  const factor = gramsFor(ingredient.amount, ingredient.unit) / 100
  return {
    calories: factor * (def?.caloriesPer100g ?? 0),
    protein: factor * (def?.proteinPer100g ?? 0),
    carbs: factor * (def?.carbsPer100g ?? 0),
    fat: factor * (def?.fatPer100g ?? 0),
  }
}

export function recipeMacros(recipe: Recipe, catalog: IngredientDef[]): Macros {
  return recipe.ingredients.reduce(
    (total, ing) => {
      const m = estimateMacros(ing, catalog)
      return {
        calories: total.calories + m.calories,
        protein: total.protein + m.protein,
        carbs: total.carbs + m.carbs,
        fat: total.fat + m.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary (little exercise)', multiplier: 1.2 },
  { value: 'light', label: 'Light exercise', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate exercise', multiplier: 1.55 },
  { value: 'active', label: 'Active', multiplier: 1.725 },
  { value: 'very_active', label: 'Very active', multiplier: 1.9 },
]

export type Goal = 'lose' | 'maintain' | 'gain'

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
]

export type Profile = {
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activity: ActivityLevel
  goal: Goal
  worksOut: boolean
  takesProtein: boolean
  takesCreatine: boolean
  // Set only once the user has directly edited a macro target away from the
  // suggested value — until then, targets auto-follow age/weight/goal/etc.
  customProtein?: number
  customCarbs?: number
  customFat?: number
  diet: DietType
  excludedIngredients: string[]
}

export function normalizeProfile(stored: Partial<Profile>): Profile {
  return {
    age: stored.age ?? 30,
    weightKg: stored.weightKg ?? 70,
    heightCm: stored.heightCm ?? 175,
    sex: stored.sex ?? 'male',
    activity: stored.activity ?? 'moderate',
    goal: stored.goal ?? 'maintain',
    worksOut: stored.worksOut ?? false,
    takesProtein: stored.takesProtein ?? false,
    takesCreatine: stored.takesCreatine ?? false,
    customProtein: stored.customProtein,
    customCarbs: stored.customCarbs,
    customFat: stored.customFat,
    diet: stored.diet ?? 'none',
    excludedIngredients: stored.excludedIngredients ?? [],
  }
}

// Only the fields the calorie/macro math actually needs — lets callers pass
// a draft profile before diet/exclusions/etc. are known.
type VitalStats = Pick<
  Profile,
  'age' | 'weightKg' | 'heightCm' | 'sex' | 'activity' | 'goal' | 'worksOut' | 'takesProtein'
>

// Mifflin-St Jeor equation — a standard, reasonably accurate estimate for
// maintenance calories (BMR × activity multiplier), then shifted by a
// moderate deficit/surplus for the user's goal.
export function calculateDailyTarget(profile: VitalStats): number {
  const bmr =
    profile.sex === 'male'
      ? 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5
      : 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161

  const multiplier = ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.multiplier ?? 1.2
  const maintenance = bmr * multiplier

  const adjustment = profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 300 : 0
  return Math.max(1200, Math.round(maintenance + adjustment))
}

export type MacroTargets = { calories: number; protein: number; carbs: number; fat: number }

// Rough, widely-used sports-nutrition rules of thumb — not a substitute for
// advice from a doctor or dietitian. Protein is prioritized (higher for
// people who work out, and a bit higher still on a cut to protect muscle;
// a bit higher again if supplementing, since hitting that target is easier
// with a shake in the mix), fat gets a flat per-kg baseline, and carbs fill
// whatever calories remain.
export function suggestedMacroTargets(profile: VitalStats): MacroTargets {
  const calories = calculateDailyTarget(profile)

  let proteinPerKg = profile.worksOut ? (profile.goal === 'lose' ? 2.0 : 1.8) : 1.2
  if (profile.takesProtein) proteinPerKg += 0.2
  const protein = Math.round(profile.weightKg * proteinPerKg)

  const fatPerKg = 0.8
  const fat = Math.round(profile.weightKg * fatPerKg)

  const remaining = calories - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(remaining / 4))

  return { calories, protein, carbs, fat }
}

// The targets actually used across the app: the suggested values, unless
// the user has overridden one or more macros directly — in that case
// calories are re-derived from the (possibly mixed custom/suggested) grams,
// so the numbers always stay internally consistent.
export function calculateMacroTargets(profile: Profile): MacroTargets {
  const suggested = suggestedMacroTargets(profile)
  const hasOverride = profile.customProtein != null || profile.customCarbs != null || profile.customFat != null
  if (!hasOverride) return suggested

  const protein = profile.customProtein ?? suggested.protein
  const carbs = profile.customCarbs ?? suggested.carbs
  const fat = profile.customFat ?? suggested.fat
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9)

  return { calories, protein, carbs, fat }
}
