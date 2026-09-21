import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Recipe, Week, Day, SlotKey, IngredientDef } from '../types'
import { estimateMacros, recipeMacros, calculateMacroTargets } from '../nutrition'
import type { Profile, Macros } from '../nutrition'

type CaloriesProps = {
  recipes: Recipe[]
  weeks: Week[]
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
}

// badge classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them in this file
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: 'Breakfast', badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: 'Lunch', badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: 'Afternoon', badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: 'Dinner', badge: 'bg-main-blue text-white' },
]

// Green-ish/amber/red readout of how close an average is to its target —
// used in the weekly history so it's a glance, not a math problem.
function macroStatusClass(actual: number, targetVal: number): string {
  if (targetVal <= 0) return 'text-neutral-500'
  const diff = Math.abs(actual - targetVal) / targetVal
  if (diff <= 0.1) return 'text-main-teal'
  if (diff <= 0.25) return 'text-main-orange'
  return 'text-main-red'
}

// A logged "what you actually ate" entry overrides the plan for that slot,
// so these totals (and everything derived from them below) reflect real
// intake, not just what was scheduled.
function dayMacros(day: Day, recipes: Recipe[], catalog: IngredientDef[]): Macros {
  const total: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  SLOTS.forEach((slot) => {
    const actual = day.actual?.[slot.key]
    if (actual) {
      total.calories += actual.calories
      total.protein += actual.protein
      total.carbs += actual.carbs
      total.fat += actual.fat
      return
    }
    day.slots[slot.key].forEach((recipeId) => {
      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) return
      recipe.ingredients.forEach((ing) => {
        const m = estimateMacros(ing, catalog)
        total.calories += m.calories
        total.protein += m.protein
        total.carbs += m.carbs
        total.fat += m.fat
      })
    })
  })
  return {
    calories: Math.round(total.calories),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  }
}

function Calories({ recipes, weeks, ingredientCatalog, profile, onOpenRecipe }: CaloriesProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(null)
  const [selectedWeekId, setSelectedWeekId] = useState(weeks[0]?.id ?? '')

  const macroTargets = profile ? calculateMacroTargets(profile) : null
  const target = macroTargets?.calories ?? null
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? weeks[0]

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div className="flex flex-col gap-15">
          <h2 className="text-26 font-title font-bold uppercase">Calories</h2>
          <p className="text-14 font-title text-neutral-500">
            Rough estimates based on your planned recipes — not exact nutrition tracking.
          </p>

          {profile && target && macroTargets && (
            <div className="flex flex-wrap items-center gap-15">
              <span className="main-btn px-15 py-10 font-title font-bold bg-main-blue text-white">
                Daily Target: {target} kcal
              </span>
              <span className="main-btn px-15 py-10 font-title font-bold">
                P {macroTargets.protein}g · C {macroTargets.carbs}g · F {macroTargets.fat}g
              </span>
            </div>
          )}
        </div>

        {profile && target && macroTargets && selectedWeek && (
          <>
            <div className="flex flex-col gap-15">
              <div className="flex flex-wrap items-center justify-between gap-15">
                <h3 className="text-20 font-title font-bold uppercase">{selectedWeek.label} — Daily Breakdown</h3>
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="bg-white border-3 border-black pl-15 pr-30 py-10 text-14 font-title font-bold min-w-150"
                >
                  {weeks.map((week) => (
                    <option key={week.id} value={week.id}>
                      {week.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15">
                {selectedWeek.days.map((day) => {
                  const macros = dayMacros(day, recipes, ingredientCatalog)
                  const pct = Math.min(100, Math.round((macros.calories / target) * 100))
                  const over = macros.calories > target * 1.1

                  return (
                    <button
                      key={day.label}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className="main-btn p-15 flex flex-col gap-10 text-left hover:bg-neutral-50"
                    >
                      <span className="font-title font-bold uppercase text-16">{day.label}</span>
                      <span className="text-14 font-title text-neutral-500">
                        {macros.calories} / {target} kcal
                      </span>
                      <div className="w-full h-15 border-2 border-black bg-neutral-100">
                        <div
                          className={over ? 'h-full bg-main-red' : 'h-full bg-main-blue'}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-12 font-title text-neutral-500">
                        P {macros.protein}g · C {macros.carbs}g · F {macros.fat}g
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">History (avg / day per week)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                {weeks.map((week) => {
                  const weekMacros = week.days.reduce(
                    (sum, day) => {
                      const m = dayMacros(day, recipes, ingredientCatalog)
                      return {
                        calories: sum.calories + m.calories,
                        protein: sum.protein + m.protein,
                        carbs: sum.carbs + m.carbs,
                        fat: sum.fat + m.fat,
                      }
                    },
                    { calories: 0, protein: 0, carbs: 0, fat: 0 },
                  )
                  const avg = Math.round(weekMacros.calories / 7)
                  const avgProtein = Math.round(weekMacros.protein / 7)
                  const avgCarbs = Math.round(weekMacros.carbs / 7)
                  const avgFat = Math.round(weekMacros.fat / 7)
                  return (
                    <div key={week.id} className="main-btn p-15 flex flex-col gap-5">
                      <span className="font-title font-bold uppercase">{week.label}</span>
                      <span className={`text-14 font-title font-bold ${macroStatusClass(avg, target)}`}>
                        Avg {avg} / {target} kcal
                      </span>
                      <span className="text-12 font-title">
                        <span className={`font-bold ${macroStatusClass(avgProtein, macroTargets.protein)}`}>
                          P {avgProtein}g
                        </span>
                        <span className="text-neutral-500"> · </span>
                        <span className={`font-bold ${macroStatusClass(avgCarbs, macroTargets.carbs)}`}>
                          C {avgCarbs}g
                        </span>
                        <span className="text-neutral-500"> · </span>
                        <span className={`font-bold ${macroStatusClass(avgFat, macroTargets.fat)}`}>
                          F {avgFat}g
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedDay &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
            onClick={() => setSelectedDay(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="main-btn bg-white p-30 flex flex-col gap-20 w-full max-w-[420px]"
            >
              <div className="flex items-center justify-between gap-10">
                <h2 className="text-20 font-title font-bold uppercase">{selectedDay.label}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                  className="text-black hover:text-main-red font-bold text-20 leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-20">
                {SLOTS.map((slot) => {
                  const recipeIds = selectedDay.slots[slot.key]
                  const actual = selectedDay.actual?.[slot.key]
                  return (
                    <div key={slot.key} className="flex flex-col gap-10">
                      <span
                        className={`main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase ${slot.badge}`}
                      >
                        {slot.label}
                      </span>
                      {actual ? (
                        <div className="main-btn flex items-center gap-10 p-10 bg-main-yellow/20">
                          {actual.photo && (
                            <img
                              src={actual.photo}
                              alt=""
                              className="w-40 h-40 object-cover border-2 border-black shrink-0"
                            />
                          )}
                          <span className="flex flex-col">
                            <span className="text-12 font-title font-bold uppercase text-neutral-500">
                              Actually ate
                            </span>
                            <span className="text-14 font-title font-bold">{actual.description}</span>
                            <span className="text-12 font-title text-neutral-500">
                              {Math.round(actual.calories)} kcal · P {Math.round(actual.protein)}g · C{' '}
                              {Math.round(actual.carbs)}g · F {Math.round(actual.fat)}g
                            </span>
                          </span>
                        </div>
                      ) : recipeIds.length === 0 ? (
                        <p className="text-14 font-title text-neutral-500">Nothing planned.</p>
                      ) : (
                        <div className="flex flex-col gap-10">
                          {recipeIds.map((recipeId, i) => {
                            const recipe = recipes.find((r) => r.id === recipeId)
                            if (!recipe) return null
                            const macros = recipeMacros(recipe, ingredientCatalog)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setSelectedDay(null)
                                  onOpenRecipe(recipe.id)
                                }}
                                className="main-btn text-left px-10 py-10 flex flex-col gap-5 hover:bg-main-yellow"
                              >
                                <span className="text-14 font-title font-bold">{recipe.title}</span>
                                <span className="text-12 font-title text-neutral-500">
                                  {Math.round(macros.calories)} kcal · P {Math.round(macros.protein)}g · C{' '}
                                  {Math.round(macros.carbs)}g · F {Math.round(macros.fat)}g
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="main-btn font-title font-bold px-15 py-10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export default Calories
