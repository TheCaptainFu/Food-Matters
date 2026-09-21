import type { Recipe } from './types'

export type DietType = 'none' | 'vegetarian' | 'vegan'

export const DIET_TYPES: { value: DietType; label: string }[] = [
  { value: 'none', label: 'No restriction' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
]

// Keyword-based, not a per-ingredient database — works on ingredient NAMES
// (including ones the user adds themselves) rather than requiring every
// catalog entry to carry its own diet tags.
const MEAT_FISH_KEYWORDS = [
  'chicken',
  'beef',
  'pork',
  'bacon',
  'ham',
  'sausage',
  'turkey',
  'lamb',
  'veal',
  'salmon',
  'tuna',
  'shrimp',
  'cod',
  'tilapia',
  'sardine',
  'mackerel',
  'squid',
  'mussel',
  'fish',
  'meat',
  'duck',
  'anchovy',
  'crab',
  'lobster',
  'oyster',
  'clam',
  'gelatin',
]

const ANIMAL_PRODUCT_KEYWORDS = [
  'egg',
  'milk',
  'yogurt',
  'yoghurt',
  'cheese',
  'cream',
  'butter',
  'honey',
  'mayonnaise',
  'whey',
  'ghee',
  // named cheeses whose names don't contain the word "cheese"
  'mozzarella',
  'parmesan',
  'ricotta',
  'provolone',
  'brie',
]

// Plant-based ingredients whose names happen to contain a dairy keyword
// ("milk", "butter", ...) — checked before the keyword match so they don't
// get misclassified.
const VEGAN_SAFE_EXCEPTIONS = [
  'almond milk',
  'oat milk',
  'soy milk',
  'coconut milk',
  'peanut butter',
  'cocoa butter',
  'shea butter',
  'almond flour',
]

function containsKeyword(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

function isException(name: string): boolean {
  const lower = name.toLowerCase()
  return VEGAN_SAFE_EXCEPTIONS.some((e) => lower.includes(e))
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
