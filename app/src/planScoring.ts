import type { Macros } from './nutrition'

// How far a day (or a slot) is from its targets — lower is better.
// Not all misses are equal:
// - protein is the hard one: falling short counts heavily, going a bit
//   over hardly counts at all (extra protein is fine, missing it isn't);
// - calories matter most after that, in both directions;
// - carbs and fat just fill the rest, so they weigh least.
export function planScore(value: Macros, target: Macros): number {
  const rel = (v: number, t: number) => (t > 0 ? (v - t) / t : 0)
  const protein = rel(value.protein, target.protein)
  return (
    Math.abs(rel(value.calories, target.calories)) * 2 +
    (protein < 0 ? -protein * 4 : protein * 0.3) +
    Math.abs(rel(value.carbs, target.carbs)) * 0.5 +
    Math.abs(rel(value.fat, target.fat)) * 0.5
  )
}
