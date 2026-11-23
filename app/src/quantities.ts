import type { Ingredient, IngredientDef, Unit } from './types'

// Turning recipe amounts into grams (for calories and the shopping list) and
// into something readable ("2 αυγά", "½ κρεμμύδι", "1 κ.σ.").

export function findDef(name: string, catalog: IngredientDef[]): IngredientDef | undefined {
  const key = name.trim().toLowerCase()
  return catalog.find((c) => c.name.toLowerCase() === key)
}

// Rough gram equivalents for non-gram units.
export function toGrams(amount: number, unit: Unit, def?: IngredientDef): number {
  switch (unit) {
    case 'g':
      return amount
    case 'piece':
      return amount * (def?.gramsPerPiece ?? 100)
    case 'tsp':
      return amount * 5
    case 'tbsp':
      return amount * 15
    case 'package':
      return amount * 100
  }
}

// 1.5 → "1½", 0.5 → "½", 0.25 → "¼", otherwise up to one decimal.
export function formatCount(value: number): string {
  const quarters = Math.round(value * 4) / 4
  if (Math.abs(quarters - value) < 0.01) {
    const whole = Math.floor(quarters)
    const frac = quarters - whole
    const glyph = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : ''
    if (glyph) return whole === 0 ? glyph : `${whole}${glyph}`
    return String(whole)
  }
  return String(Math.round(value * 10) / 10).replace('.', ',')
}

const UNIT_SHORT: Record<Exclude<Unit, 'g' | 'piece'>, string> = {
  package: 'συσκ.',
  tsp: 'κ.γλ.',
  tbsp: 'κ.σ.',
}

export function pieceWord(count: number, def?: IngredientDef): string {
  if (!def?.pieceName) return 'τεμ.'
  return count > 1 ? def.pieceName[1] : def.pieceName[0]
}

// "150g", "2 τεμ.", "1 σκελίδα", "1½ κ.σ."
export function formatQuantity(amount: number, unit: Unit, def?: IngredientDef): string {
  if (unit === 'g') {
    if (amount >= 1000) return `${formatCount(amount / 1000)} kg`
    return amount < 10 ? `${formatCount(amount)}g` : `${Math.round(amount)}g`
  }
  if (unit === 'piece') return `${formatCount(amount)} ${pieceWord(amount, def)}`
  return `${formatCount(amount)} ${UNIT_SHORT[unit]}`
}

// For the shopping list: a total in grams, shown in pieces when the
// ingredient is something you count (rounded up to whole pieces — you can't
// buy half an egg), else in grams.
export function formatShoppingAmount(grams: number, def?: IngredientDef): string {
  if (def?.gramsPerPiece) {
    const pieces = Math.max(1, Math.ceil(grams / def.gramsPerPiece - 0.15))
    return `${pieces} ${pieceWord(pieces, def)}`
  }
  // A pinch of salt or oregano isn't something to measure on a list.
  if (grams < 5) return 'λίγο'
  if (grams >= 1000) return `${formatCount(Math.round(grams / 100) / 10)} kg`
  return `${Math.max(1, Math.round(grams / 10) * 10)}g`
}

// Seed recipes are written in grams; for countable ingredients this turns
// e.g. 120g eggs into 2 pieces when that's a close, natural count (whole
// or half pieces, at least half a piece). Otherwise grams stay.
export function toNaturalUnit(ing: Ingredient, catalog: IngredientDef[]): Ingredient {
  if (ing.unit !== 'g') return ing
  const def = findDef(ing.name, catalog)
  if (!def?.gramsPerPiece) return ing
  const exact = ing.amount / def.gramsPerPiece
  const halves = Math.round(exact * 2) / 2
  if (halves < 0.5 || Math.abs(halves - exact) / exact > 0.25) return ing
  return { ...ing, amount: halves, unit: 'piece' }
}
