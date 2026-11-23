import type { Recipe } from './types'

export type DietType = 'none' | 'vegetarian' | 'vegan'

export const DIET_TYPES: { value: DietType; label: string }[] = [
  { value: 'none', label: 'Χωρίς περιορισμό' },
  { value: 'vegetarian', label: 'Χορτοφαγική' },
  { value: 'vegan', label: 'Vegan' },
]

// Keyword-based, not a per-ingredient database — works on ingredient NAMES
// (including ones the user adds themselves). Names are compared lowercase
// and without Greek accents, so keywords are written without accents.
const MEAT_FISH_KEYWORDS = [
  'κοτοπουλ',
  'κιμα',
  'μοσχαρ',
  'χοιριν',
  'αρνι',
  'κατσικ',
  'γαλοπουλ',
  'συκωτ',
  'λουκανικ',
  'ζαμπον',
  'μπεικον',
  'παστουρμα',
  'σουτζουκ',
  'κρεας',
  'ψαρι',
  'τσιπουρα',
  'λαβρακι',
  'σολομ',
  'μπακαλιαρ',
  'γαυρ',
  'σαρδελ',
  'σκουμπρ',
  'γλωσσα',
  'χταποδ',
  'καλαμαρ',
  'σουπια',
  'γαριδ',
  'μυδι',
  'τονος',
  'ζελατιν',
]

const ANIMAL_PRODUCT_KEYWORDS = [
  'αυγ',
  'γαλα',
  'γιαουρτ',
  'τζατζικ',
  'τυρ',
  'φετα',
  'κεφαλοτυρ',
  'γραβιερ',
  'κασερ',
  'μυζηθρ',
  'ανθοτυρ',
  'κατικ',
  'χαλουμ',
  'μοτσαρελ',
  'παρμεζαν',
  'κρεμα',
  'βουτυρ',
  'μελι',
  'μαγιονεζ',
  'whey',
  'ορου',
]

// Plant-based ingredients whose names happen to contain an animal keyword
// ("γάλα" in "ρόφημα", "βούτυρο" in "φυστικοβούτυρο", "μέλι" in
// "μελιτζάνα"…) — checked before the keyword match.
const VEGAN_SAFE_EXCEPTIONS = ['ροφημα', 'φυστικοβουτυρ', 'μελιτζαν', 'ζωμος λαχανικων']

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function containsKeyword(name: string, keywords: string[]): boolean {
  const n = normalize(name)
  return keywords.some((k) => n.includes(k))
}

function isException(name: string): boolean {
  const n = normalize(name)
  return VEGAN_SAFE_EXCEPTIONS.some((e) => n.includes(e))
}

export function isIngredientVegetarian(name: string): boolean {
  if (isException(name)) return true
  return !containsKeyword(name, MEAT_FISH_KEYWORDS)
}

export function isIngredientVegan(name: string): boolean {
  if (isException(name)) return true
  return !containsKeyword(name, MEAT_FISH_KEYWORDS) && !containsKeyword(name, ANIMAL_PRODUCT_KEYWORDS)
}

// A recipe is compatible if none of its ingredients are excluded (allergy /
// dislike) and, depending on diet, none are meat/fish (vegetarian) or any
// animal product (vegan).
export function isRecipeCompatible(recipe: Recipe, diet: DietType, excludedIngredients: string[]): boolean {
  const excludedLower = new Set(excludedIngredients.map((n) => n.toLowerCase()))
  return recipe.ingredients.every((ing) => {
    if (excludedLower.has(ing.name.toLowerCase())) return false
    if (diet === 'vegetarian' && !isIngredientVegetarian(ing.name)) return false
    if (diet === 'vegan' && !isIngredientVegan(ing.name)) return false
    return true
  })
}

export function filterCompatibleRecipes(recipes: Recipe[], diet: DietType, excludedIngredients: string[]): Recipe[] {
  return recipes.filter((r) => isRecipeCompatible(r, diet, excludedIngredients))
}
