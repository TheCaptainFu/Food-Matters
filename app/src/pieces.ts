import type { ActualEntry, IngredientDef, Recipe, RecipePieces } from './types'
import { recipeMacros, scaleMacros, type Macros } from './nutrition'

// Food in pieces (μπιφτέκια with potatoes): the pieces and the side are
// counted apart, so "4 μπιφτέκια, same potatoes" is logged right.

export type PiecesRecipe = Recipe & { pieces: RecipePieces }

export function hasPieces(recipe: Recipe | undefined): recipe is PiecesRecipe {
  return !!recipe?.pieces && recipe.ingredients.length > 0
}

// The food a logged entry came from: saved with it, or (older entries) the
// food with the same name.
export function entryRecipe(entry: ActualEntry, recipes: Recipe[]): Recipe | undefined {
  if (entry.recipeId) return recipes.find((r) => r.id === entry.recipeId)
  const name = entry.description.trim().toLowerCase()
  return recipes.find((r) => r.title.toLowerCase() === name)
}

// One portion split in two: what makes the pieces, and the rest.
function split(recipe: PiecesRecipe, catalog: IngredientDef[]): { main: Macros; rest: Macros } {
  const isMain = (name: string) => recipe.pieces.main.includes(name)
  const part = (keep: boolean) =>
    recipeMacros({ ...recipe, fixedMacros: undefined, ingredients: recipe.ingredients.filter((i) => isMain(i.name) === keep) }, catalog)
  return { main: part(true), rest: part(false) }
}

// ½ steps written the Greek way: 1½, ½.
export function halves(n: number): string {
  const whole = Math.floor(n)
  const half = n - whole >= 0.5
  if (!half) return String(whole)
  return whole > 0 ? `${whole}½` : '½'
}

export function piecesText(recipe: PiecesRecipe, pieces: number, side: number): string {
  const p = recipe.pieces
  const main = `${halves(pieces)} ${pieces === 1 ? p.one : p.many}`
  if (!p.side || side === 1) return main
  return `${main} · ${p.side} ${side === 0 ? '✕' : `×${halves(side)}`}`
}

// A log entry for so many pieces and so much of the side (1 = the recipe's).
export function piecesEntry(
  recipe: PiecesRecipe,
  catalog: IngredientDef[],
  pieces: number,
  side: number,
  base: Partial<ActualEntry> = {},
): ActualEntry {
  const { main, rest } = split(recipe, catalog)
  const m = scaleMacros(main, pieces / recipe.pieces.count)
  const r = scaleMacros(rest, recipe.pieces.side ? side : 1)
  return {
    ...base,
    recipeId: recipe.id,
    description: recipe.title,
    calories: Math.round(m.calories + r.calories),
    protein: Math.round(m.protein + r.protein),
    carbs: Math.round(m.carbs + r.carbs),
    fat: Math.round(m.fat + r.fat),
    portion: undefined,
    pieces,
    side,
    amountText: piecesText(recipe, pieces, side),
  }
}
