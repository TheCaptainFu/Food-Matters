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

// Nearest half-unit, formatted with a fraction glyph instead of "1.5" so it
// reads like a recipe card ("1½ tbsp") rather than a calculator output.
function formatSpoonCount(value: number): string {
  const whole = Math.floor(value)
  const isHalf = value - whole >= 0.25 && value - whole < 0.75
  if (whole === 0) return isHalf ? '½' : `${Math.round(value)}`
  return isHalf ? `${whole}½` : `${Math.round(value)}`
}

// A gram amount doesn't mean much to someone without a kitchen scale, so we
// offer a rough spoon-based reading alongside it — same 5g/tsp, 15g/tbsp
// approximation already used for the calorie estimate above. It's an
// estimate (spoon size varies by ingredient), so we only show it as a hint.
export function spoonHint(grams: number): string | null {
  if (grams < 2.5) return null
  if (grams < 12.5) {
    const tsp = Math.round((grams / 5) * 2) / 2
    return `≈ ${formatSpoonCount(tsp)} κ.γλ.`
  }
  const tbsp = Math.round((grams / 15) * 2) / 2
  return `≈ ${formatSpoonCount(tbsp)} κ.σ.`
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

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string; multiplier: number }[] = [
  // Descriptions spell out the frequency each standard multiplier assumes,
  // so people can place themselves instead of guessing what "active" means.
  { value: 'sedentary', label: 'Καθιστική ζωή', description: 'Δουλειά γραφείου, λίγη ή καθόλου άσκηση', multiplier: 1.2 },
  { value: 'light', label: 'Λίγο δραστήριος', description: 'Άσκηση 1–3 μέρες την εβδομάδα', multiplier: 1.375 },
  { value: 'moderate', label: 'Μέτρια δραστήριος', description: 'Άσκηση 3–5 μέρες την εβδομάδα', multiplier: 1.55 },
  { value: 'active', label: 'Πολύ δραστήριος', description: 'Έντονη άσκηση 6–7 μέρες την εβδομάδα', multiplier: 1.725 },
  {
    value: 'very_active',
    label: 'Εξαιρετικά δραστήριος',
    description: 'Χειρωνακτική δουλειά ή προπόνηση δύο φορές τη μέρα',
    multiplier: 1.9,
  },
]

export type Goal = 'lose' | 'maintain' | 'gain'

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Απώλεια βάρους' },
  { value: 'maintain', label: 'Διατήρηση' },
  { value: 'gain', label: 'Αύξηση βάρους' },
]

// How fast to move towards the goal, as a share of maintenance calories —
// a percentage scales with the person (a flat −500 kcal is a gentle cut for
// a 100 kg man but a crash diet for a 50 kg woman).
export type Pace = 'slow' | 'normal' | 'fast'

export const PACES: { value: Pace; label: string; lose: number; gain: number }[] = [
  { value: 'slow', label: 'Ήπια', lose: 0.1, gain: 0.05 },
  { value: 'normal', label: 'Κανονικά', lose: 0.2, gain: 0.1 },
  { value: 'fast', label: 'Γρήγορα', lose: 0.25, gain: 0.15 },
]

export type Profile = {
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activity: ActivityLevel
  goal: Goal
  pace: Pace
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
    pace: stored.pace ?? 'normal',
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
export type VitalStats = Pick<Profile, 'age' | 'weightKg' | 'heightCm' | 'sex' | 'activity' | 'goal' | 'pace' | 'worksOut'>

// Below these, a diet is hard to get enough nutrients from without medical
// supervision — the usual guidance is ~1200 kcal for women, ~1500 for men.
const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 }

export type CalorieBreakdown = {
  bmr: number // burned at complete rest
  maintenance: number // with your activity — eating this keeps weight stable
  adjustment: number // the deficit/surplus for the goal (negative = deficit)
  calories: number // the daily target
  hitFloor: boolean // the deficit was capped by the minimum
}

// Mifflin-St Jeor (the most accurate of the standard formulas for adults)
// gives the BMR; × activity gives maintenance; the goal and pace shift it.
export function calorieBreakdown(profile: VitalStats): CalorieBreakdown {
  const bmr =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161)
  const multiplier = ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.multiplier ?? 1.2
  const maintenance = bmr * multiplier

  const pace = PACES.find((p) => p.value === profile.pace) ?? PACES[1]
  const share = profile.goal === 'lose' ? -pace.lose : profile.goal === 'gain' ? pace.gain : 0
  const wanted = maintenance * (1 + share)
  const floor = MIN_CALORIES[profile.sex]
  const calories = Math.round(Math.max(wanted, Math.min(floor, maintenance)))

  return {
    bmr: Math.round(bmr),
    maintenance: Math.round(maintenance),
    adjustment: calories - Math.round(maintenance),
    calories,
    hitFloor: calories > Math.round(wanted),
  }
}

export function calculateDailyTarget(profile: VitalStats): number {
  return calorieBreakdown(profile).calories
}

export type MacroTargets = { calories: number; protein: number; carbs: number; fat: number }

// The weight protein and fat are worked out from. Above a BMI of ~27,
// per-kg rules overshoot (fat mass doesn't need protein), so we use the
// weight at BMI 25 plus a quarter of the excess (the usual "adjusted body
// weight").
function referenceWeight(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  if (bmi <= 27) return weightKg
  const ideal = 25 * heightM * heightM
  return ideal + 0.25 * (weightKg - ideal)
}

// Rough, widely-used sports-nutrition rules of thumb — not a substitute for
// advice from a doctor or dietitian.
// - Protein first: 1.6–2.0 g/kg if you lift (more on a cut, to keep muscle),
//   1.2 otherwise, 1.5 when losing weight, and at least 1.2 from 65 up.
// - Fat 28% of calories (within the 20–35% guideline), but never under
//   0.6 g/kg — fat is needed for hormones and vitamin absorption.
// - Carbs fill whatever calories remain.
const FAT_SHARE_OF_CALORIES = 0.28

export function suggestedMacroTargets(profile: VitalStats): MacroTargets {
  const calories = calculateDailyTarget(profile)
  const refKg = referenceWeight(profile.weightKg, profile.heightCm)

  let proteinPerKg = profile.worksOut
    ? profile.goal === 'lose'
      ? 2.0
      : 1.8
    : profile.goal === 'lose'
      ? 1.5
      : 1.2
  if (profile.age >= 65) proteinPerKg = Math.max(proteinPerKg, 1.2)
  const protein = Math.round(refKg * proteinPerKg)

  const fat = Math.round(Math.max((calories * FAT_SHARE_OF_CALORIES) / 9, refKg * 0.6))

  const remaining = calories - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(remaining / 4))

  return { calories, protein, carbs, fat }
}

// 35ml per kg of body weight is a commonly used dietitian rule of thumb for
// daily water intake, plus extra for anyone working out regularly to cover
// sweat loss. Rounded to the nearest 100ml so it reads like a real target,
// not a lab measurement.
export function calculateWaterTargetMl(profile: Pick<Profile, 'weightKg' | 'worksOut'>): number {
  const base = profile.weightKg * 35
  const withExercise = profile.worksOut ? base + 500 : base
  return Math.round(withExercise / 100) * 100
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
