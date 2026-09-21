import { useState } from 'react'
import type { ActualEntry, Day, IngredientDef, Recipe, SlotKey, Week } from '../types'
import type { Macros, Profile } from '../nutrition'
import { calculateMacroTargets, recipeMacros } from '../nutrition'
import { filterCompatibleRecipes } from '../dietaryRestrictions'
import { makeWeek } from '../weekUtils'
import ConfirmModal from './ConfirmModal'
import RecipePickerModal from './RecipePickerModal'
import SuggestAlternativesModal from './SuggestAlternativesModal'
import ActualEntryModal from './ActualEntryModal'

// Normalized distance across calories + all three macros, so "closest
// match" accounts for hitting protein/carbs/fat, not just total calories.
function macroDistance(candidate: Macros, budget: Macros): number {
  const rel = (value: number, target: number) => (target > 0 ? Math.abs(value - target) / target : 0)
  return (
    rel(candidate.calories, budget.calories) +
    rel(candidate.protein, budget.protein) +
    rel(candidate.carbs, budget.carbs) +
    rel(candidate.fat, budget.fat)
  )
}

// badge classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them in this file
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: 'Breakfast', badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: 'Lunch', badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: 'Afternoon', badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: 'Dinner', badge: 'bg-main-blue text-white' },
]

// How the day's targets (calories and each macro alike) split across slots
// when auto-filling.
const SLOT_SHARE: Record<SlotKey, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  afternoon: 0.1,
  dinner: 0.3,
}

type CalendarProps = {
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
  weeks: Week[]
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  activeWeekId: string
  setActiveWeekId: (id: string) => void
}

type PendingConfirm = {
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

type SuggestTarget = { dayIndex: number; slotKey: SlotKey; recipeIndex: number }
type ActualTarget = { dayIndex: number; slotKey: SlotKey }

function Calendar({
  recipes,
  ingredientCatalog,
  profile,
  onOpenRecipe,
  weeks,
  setWeeks,
  activeWeekId,
  setActiveWeekId,
}: CalendarProps) {
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [editingDays, setEditingDays] = useState<Set<number>>(new Set())
  const [suggestTarget, setSuggestTarget] = useState<SuggestTarget | null>(null)
  const [actualTarget, setActualTarget] = useState<ActualTarget | null>(null)

  const dailyMacroTargets = profile ? calculateMacroTargets(profile) : null
  const dailyTarget = dailyMacroTargets?.calories ?? null

  // Recipes that respect the profile's diet (vegetarian/vegan) and
  // excluded ingredients (allergies/dislikes) — what Auto-fill, Suggest
  // other and the manual picker are allowed to offer.
  const compatibleRecipes = profile
    ? filterCompatibleRecipes(recipes, profile.diet, profile.excludedIngredients)
    : recipes

  // Further narrows to recipes tagged for that meal — so breakfast never
  // gets offered pasta, for instance. Falls back to the full compatible
  // list if nothing is tagged for that slot yet (e.g. a brand-new recipe
  // library), rather than offering nothing at all.
  function recipesForSlot(slotKey: SlotKey): Recipe[] {
    // Guard against recipes saved before mealTypes existed (no field on
    // them yet) — treat those as fitting every slot rather than crashing.
    const tagged = compatibleRecipes.filter((r) => (r.mealTypes ?? []).includes(slotKey))
    return tagged.length > 0 ? tagged : compatibleRecipes
  }

  function toggleEditDay(dayIndex: number) {
    setEditingDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }

  const activeWeek = weeks.find((w) => w.id === activeWeekId) ?? weeks[0]

  function addWeek() {
    const week = makeWeek(`Week ${weeks.length + 1}`)
    setWeeks((prev) => [...prev, week])
    setActiveWeekId(week.id)
  }

  function deleteWeek() {
    if (weeks.length <= 1) return
    setPendingConfirm({
      message: `Delete "${activeWeek.label}"? This cannot be undone.`,
      onConfirm: () => {
        const remaining = weeks
          .filter((w) => w.id !== activeWeekId)
          // renumber default "Week N" labels so they stay sequential after
          // a delete (e.g. Week 1/2/3 → delete Week 2 → Week 1/2, not 1/3)
          .map((w, i) => (/^Week \d+$/.test(w.label) ? { ...w, label: `Week ${i + 1}` } : w))
        setWeeks(remaining)
        setActiveWeekId(remaining[0].id)
      },
    })
  }

  function addRecipesToSlot(dayIndex: number, slotKey: SlotKey, recipeIds: string[]) {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== activeWeekId) return week
        return {
          ...week,
          days: week.days.map((day, i) => {
            if (i !== dayIndex) return day
            return {
              ...day,
              slots: { ...day.slots, [slotKey]: [...day.slots[slotKey], ...recipeIds] },
            }
          }),
        }
      }),
    )
  }

  function moveRecipe(
    from: { dayIndex: number; slotKey: SlotKey; recipeIndex: number },
    to: { dayIndex: number; slotKey: SlotKey },
  ) {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== activeWeekId) return week
        const recipeId = week.days[from.dayIndex]?.slots[from.slotKey][from.recipeIndex]
        if (!recipeId) return week

        const afterRemoval = week.days.map((day, i) => {
          if (i !== from.dayIndex) return day
          return {
            ...day,
            slots: {
              ...day.slots,
              [from.slotKey]: day.slots[from.slotKey].filter((_, idx) => idx !== from.recipeIndex),
            },
          }
        })

        const afterAdd = afterRemoval.map((day, i) => {
          if (i !== to.dayIndex) return day
          return {
            ...day,
            slots: { ...day.slots, [to.slotKey]: [...day.slots[to.slotKey], recipeId] },
          }
        })

        return { ...week, days: afterAdd }
      }),
    )
  }

  function removeRecipeFromSlot(dayIndex: number, slotKey: SlotKey, recipeIndex: number) {
    setPendingConfirm({
      message: 'Remove this recipe from the slot?',
      confirmLabel: 'Remove',
      onConfirm: () => {
        setWeeks((prev) =>
          prev.map((week) => {
            if (week.id !== activeWeekId) return week
            return {
              ...week,
              days: week.days.map((day, i) => {
                if (i !== dayIndex) return day
                return {
                  ...day,
                  slots: {
                    ...day.slots,
                    [slotKey]: day.slots[slotKey].filter((_, idx) => idx !== recipeIndex),
                  },
                }
              }),
            }
          }),
        )
      },
    })
  }

  function replaceRecipeInSlot(dayIndex: number, slotKey: SlotKey, recipeIndex: number, newRecipeId: string) {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== activeWeekId) return week
        return {
          ...week,
          days: week.days.map((day, i) => {
            if (i !== dayIndex) return day
            return {
              ...day,
              slots: {
                ...day.slots,
                [slotKey]: day.slots[slotKey].map((id, idx) => (idx === recipeIndex ? newRecipeId : id)),
              },
            }
          }),
        }
      }),
    )
  }

  // Logs (or clears) what was actually eaten for a slot — independent of
  // the plan sitting there, so correcting today never edits the plan
  // itself.
  function setActualEntry(dayIndex: number, slotKey: SlotKey, entry: ActualEntry) {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== activeWeekId) return week
        return {
          ...week,
          days: week.days.map((day, i) =>
            i !== dayIndex ? day : { ...day, actual: { ...day.actual, [slotKey]: entry } },
          ),
        }
      }),
    )
  }

  function clearActualEntry(dayIndex: number, slotKey: SlotKey) {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== activeWeekId) return week
        return {
          ...week,
          days: week.days.map((day, i) => {
            if (i !== dayIndex) return day
            const nextActual = { ...day.actual }
            delete nextActual[slotKey]
            return { ...day, actual: nextActual }
          }),
        }
      }),
    )
  }

  // Top 3 recipes in the same category (and still fit for that meal) whose
  // full macro profile (calories, protein, carbs, fat) is closest to the
  // given recipe's — candidates for an "I don't feel like this one" swap
  // that doesn't throw off the day's targets.
  function getAlternatives(current: Recipe, slotKey: SlotKey): Recipe[] {
    const currentMacros = recipeMacros(current, ingredientCatalog)
    return recipesForSlot(slotKey)
      .filter((r) => r.id !== current.id && r.category === current.category)
      .sort(
        (a, b) =>
          macroDistance(recipeMacros(a, ingredientCatalog), currentMacros) -
          macroDistance(recipeMacros(b, ingredientCatalog), currentMacros),
      )
      .slice(0, 3)
  }

  // Sums the macros of whatever recipes are already sitting in a day's
  // slots, so a fill knows what it's working around instead of assuming
  // the day starts from zero.
  function lockedDayMacros(slots: Day['slots']): Macros {
    return SLOTS.reduce<Macros>(
      (sum, slot) => {
        slots[slot.key].forEach((id) => {
          const r = recipes.find((rec) => rec.id === id)
          if (!r) return
          const m = recipeMacros(r, ingredientCatalog)
          sum.calories += m.calories
          sum.protein += m.protein
          sum.carbs += m.carbs
          sum.fat += m.fat
        })
        return sum
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }

  // What the day actually adds up to: a logged "what you ate" entry
  // overrides the plan for that slot, and any slot without one still counts
  // toward the total using its planned recipes — so the total always
  // reflects reality, not just the parts you corrected.
  function dayTotalMacros(day: Day): Macros {
    return SLOTS.reduce<Macros>(
      (sum, slot) => {
        const actual = day.actual[slot.key]
        if (actual) {
          sum.calories += actual.calories
          sum.protein += actual.protein
          sum.carbs += actual.carbs
          sum.fat += actual.fat
          return sum
        }
        day.slots[slot.key].forEach((id) => {
          const r = recipes.find((rec) => rec.id === id)
          if (!r) return
          const m = recipeMacros(r, ingredientCatalog)
          sum.calories += m.calories
          sum.protein += m.protein
          sum.carbs += m.carbs
          sum.fat += m.fat
        })
        return sum
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }

  // Fills a day's empty slots by trying many random combinations and
  // keeping the one whose DAY TOTAL (not each slot in isolation) lands
  // closest to the daily targets — this is what actually keeps protein/
  // carbs/fat tight across the day instead of drifting under/over as
  // small per-slot mismatches add up. usageCounts is shared across a
  // whole-week run so it still favors variety, but happily repeats when
  // the compatible pool is too small to avoid it (e.g. a short vegan
  // list for a week).
  function pickFillsForDay(
    slots: Day['slots'],
    usageCounts: Map<string, number>,
  ): Partial<Record<SlotKey, Recipe>> {
    if (dailyMacroTargets === null || compatibleRecipes.length === 0) return {}

    const emptySlots = SLOTS.filter((slot) => slots[slot.key].length === 0)
    if (emptySlots.length === 0) return {}

    const lockedMacros = lockedDayMacros(slots)
    const REPEAT_PENALTY = 0.3
    const CANDIDATES_PER_SLOT = 5
    const TRIALS = 60

    const shortlists = new Map<SlotKey, Recipe[]>()
    emptySlots.forEach((slot) => {
      const share = SLOT_SHARE[slot.key]
      const slotBudget: Macros = {
        calories: dailyMacroTargets.calories * share,
        protein: dailyMacroTargets.protein * share,
        carbs: dailyMacroTargets.carbs * share,
        fat: dailyMacroTargets.fat * share,
      }
      const score = (r: Recipe) =>
        macroDistance(recipeMacros(r, ingredientCatalog), slotBudget) + (usageCounts.get(r.id) ?? 0) * REPEAT_PENALTY
      const ranked = [...recipesForSlot(slot.key)].sort((a, b) => score(a) - score(b))
      shortlists.set(slot.key, ranked.slice(0, Math.min(CANDIDATES_PER_SLOT, ranked.length)))
    })

    let best: Partial<Record<SlotKey, Recipe>> | null = null
    let bestScore = Infinity

    for (let trial = 0; trial < TRIALS; trial++) {
      const combo: Partial<Record<SlotKey, Recipe>> = {}
      const comboMacros: Macros = { ...lockedMacros }
      emptySlots.forEach((slot) => {
        const shortlist = shortlists.get(slot.key)!
        const pick = shortlist[Math.floor(Math.random() * shortlist.length)]
        combo[slot.key] = pick
        const m = recipeMacros(pick, ingredientCatalog)
        comboMacros.calories += m.calories
        comboMacros.protein += m.protein
        comboMacros.carbs += m.carbs
        comboMacros.fat += m.fat
      })
      const score = macroDistance(comboMacros, dailyMacroTargets)
      if (score < bestScore) {
        bestScore = score
        best = combo
      }
    }

    return best ?? {}
  }

  // Fills every empty slot in a day so the day's total macros land as
  // close as possible to the daily targets.
  function autoFillDay(dayIndex: number) {
    if (dailyMacroTargets === null) return
    const day = activeWeek.days[dayIndex]
    const usageCounts = new Map<string, number>()
    const picks = pickFillsForDay(day.slots, usageCounts)

    SLOTS.forEach((slot) => {
      const recipe = picks[slot.key]
      if (!recipe) return
      usageCounts.set(recipe.id, (usageCounts.get(recipe.id) ?? 0) + 1)
      addRecipesToSlot(dayIndex, slot.key, [recipe.id])
    })
  }

  // Clears every slot in the week first, then fills the whole thing from
  // scratch, so the result actually tracks the current targets instead of
  // leaving old or mismatched picks sitting there.
  function regenerateWeek() {
    if (dailyMacroTargets === null) return
    setPendingConfirm({
      message: `Clear and regenerate all of "${activeWeek.label}" to match your targets? This cannot be undone.`,
      confirmLabel: 'Regenerate',
      onConfirm: () => {
        const usageCounts = new Map<string, number>()
        const emptySlots: Day['slots'] = { breakfast: [], lunch: [], afternoon: [], dinner: [] }
        const filledDays = activeWeek.days.map((day) => {
          const picks = pickFillsForDay(emptySlots, usageCounts)
          const slots: Day['slots'] = { breakfast: [], lunch: [], afternoon: [], dinner: [] }
          SLOTS.forEach((slot) => {
            const recipe = picks[slot.key]
            if (!recipe) return
            usageCounts.set(recipe.id, (usageCounts.get(recipe.id) ?? 0) + 1)
            slots[slot.key] = [recipe.id]
          })
          return { ...day, slots }
        })

        setWeeks((prev) => prev.map((week) => (week.id === activeWeekId ? { ...week, days: filledDays } : week)))
      },
    })
  }

  const suggestCurrentRecipeId = suggestTarget
    ? activeWeek.days[suggestTarget.dayIndex]?.slots[suggestTarget.slotKey][suggestTarget.recipeIndex]
    : null
  const suggestCurrentRecipe = suggestCurrentRecipeId
    ? (recipes.find((r) => r.id === suggestCurrentRecipeId) ?? null)
    : null

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-20">
        <div className="flex flex-wrap items-center justify-between gap-10">
          <div className="flex flex-wrap gap-10">
            {weeks.map((week) => (
              <button
                key={week.id}
                type="button"
                onClick={() => setActiveWeekId(week.id)}
                className={
                  week.id === activeWeekId
                    ? 'main-btn font-title font-bold bg-main-blue text-white px-15 py-10'
                    : 'main-btn font-title font-bold px-15 py-10'
                }
              >
                {week.label}
              </button>
            ))}
            <button type="button" onClick={addWeek} className="main-btn font-title font-bold px-15 py-10">
              + Week
            </button>
          </div>

          <div className="flex flex-wrap gap-10">
            <button
              type="button"
              onClick={regenerateWeek}
              disabled={dailyTarget === null}
              title={
                dailyTarget === null
                  ? 'Set your profile in Calories first'
                  : 'Clear this week and regenerate it entirely to match your targets'
              }
              className="main-btn font-title font-bold px-15 py-10 bg-main-blue text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Regenerate Week
            </button>
            <button
              type="button"
              onClick={deleteWeek}
              disabled={weeks.length <= 1}
              className="main-btn font-title font-bold px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
            >
              Delete Week
            </button>
          </div>
        </div>

        {profile && (profile.diet !== 'none' || profile.excludedIngredients.length > 0) && (
          <p className="text-12 font-title text-neutral-500">
            Auto-fill and suggestions respect your{' '}
            {profile.diet !== 'none' && <span className="font-bold text-black">{profile.diet}</span>}
            {profile.diet !== 'none' && profile.excludedIngredients.length > 0 && ' diet and '}
            {profile.diet === 'none' && profile.excludedIngredients.length > 0 && 'exclusions for '}
            {profile.excludedIngredients.length > 0 && (
              <span className="font-bold text-black">{profile.excludedIngredients.join(', ')}</span>
            )}
            {' — edit this in Calories → Edit Profile.'}
          </p>
        )}

        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-20 overflow-x-auto sm:overflow-visible touch-pan-x touch-pan-y snap-x snap-proximity pb-10 sm:pb-0 -mx-20 px-20 sm:mx-0 sm:px-0">
          {activeWeek.days.map((day, dayIndex) => (
            <div
              key={day.label}
              className="main-btn flex flex-col gap-30 p-20 shrink-0 w-[85vw] sm:w-auto snap-center"
            >
              <div className="flex items-center justify-between gap-10">
                <h3 className="font-title font-bold uppercase text-18">{day.label}</h3>
                <div className="flex gap-10">
                  {editingDays.has(dayIndex) && (
                    <button
                      type="button"
                      onClick={() => autoFillDay(dayIndex)}
                      disabled={dailyTarget === null}
                      title={dailyTarget === null ? 'Set your profile in Calories first' : 'Fill empty slots to match your daily target'}
                      className="main-btn font-title font-bold px-10 py-5 text-12 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Auto-fill
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleEditDay(dayIndex)}
                    className="main-btn font-title font-bold px-10 py-5 text-12"
                  >
                    {editingDays.has(dayIndex) ? 'Done' : 'Edit'}
                  </button>
                </div>
              </div>

              {SLOTS.map((slot, slotIndex) => (
                <div
                  key={slot.key}
                  className={
                    slotIndex < SLOTS.length - 1
                      ? 'flex flex-col gap-30 pb-30 border-b border-neutral-200'
                      : 'flex flex-col gap-30'
                  }
                >
                  <span
                    className={`main-btn inline-block self-start px-10 py-5 text-16 font-title font-bold uppercase ${slot.badge}`}
                  >
                    {slot.label}
                  </span>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverKey(`${dayIndex}-${slot.key}`)
                    }}
                    onDragLeave={() => setDragOverKey(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverKey(null)
                      const raw = e.dataTransfer.getData('application/json')
                      if (!raw) return
                      const from = JSON.parse(raw) as { dayIndex: number; slotKey: SlotKey; recipeIndex: number }
                      moveRecipe(from, { dayIndex, slotKey: slot.key })
                    }}
                    className={
                      dragOverKey === `${dayIndex}-${slot.key}`
                        ? 'flex flex-col gap-15 bg-main-yellow/20 outline-3 outline-dashed outline-black -outline-offset-2'
                        : 'flex flex-col gap-15'
                    }
                  >
                    {day.slots[slot.key].map((recipeId, recipeIndex) => {
                      const recipe = recipes.find((r) => r.id === recipeId)
                      if (!recipe) return null
                      return (
                        <div
                          key={recipeIndex}
                          draggable={editingDays.has(dayIndex)}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ dayIndex, slotKey: slot.key, recipeIndex }),
                            )
                          }}
                          className="flex items-center justify-between gap-5 bg-white border-2 border-black px-10 py-5 cursor-grab active:cursor-grabbing hover:bg-neutral-50 font-bold"
                        >
                          <span
                            onClick={() => onOpenRecipe(recipe.id)}
                            className="text-14 text-black font-title"
                          >
                            {recipe.title}
                          </span>
                          {editingDays.has(dayIndex) && (
                            <div className="flex items-center gap-10 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSuggestTarget({ dayIndex, slotKey: slot.key, recipeIndex })
                                }}
                                aria-label="Suggest alternatives"
                                title="Suggest alternatives"
                                className="main-btn font-title font-bold text-12 leading-none w-20 h-20 flex items-center justify-center p-0"
                              >
                                ⇄
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeRecipeFromSlot(dayIndex, slot.key, recipeIndex)
                                }}
                                aria-label="Remove"
                                className="text-black hover:text-main-red font-bold text-14 leading-none cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {editingDays.has(dayIndex) && (
                      <SlotPicker
                        recipes={recipesForSlot(slot.key)}
                        onAdd={(recipeIds) => addRecipesToSlot(dayIndex, slot.key, recipeIds)}
                      />
                    )}

                    {day.actual[slot.key] &&
                      (() => {
                        const entry = day.actual[slot.key]!
                        const content = (
                          <>
                            {entry.photo && (
                              <img
                                src={entry.photo}
                                alt=""
                                className="w-40 h-40 object-cover border-2 border-black shrink-0"
                              />
                            )}
                            <span className="flex flex-col">
                              <span className="text-12 font-title font-bold uppercase text-neutral-500">
                                Actually ate
                              </span>
                              <span className="text-14 font-title font-bold">{entry.description}</span>
                              <span className="text-12 font-title text-neutral-500">
                                {Math.round(entry.calories)} kcal
                              </span>
                            </span>
                          </>
                        )
                        return editingDays.has(dayIndex) ? (
                          <button
                            type="button"
                            onClick={() => setActualTarget({ dayIndex, slotKey: slot.key })}
                            className="main-btn flex items-center gap-10 p-10 bg-main-yellow/20 text-left"
                          >
                            {content}
                          </button>
                        ) : (
                          <div className="main-btn flex items-center gap-10 p-10 bg-main-yellow/20">{content}</div>
                        )
                      })()}

                    {editingDays.has(dayIndex) && !day.actual[slot.key] && (
                      <button
                        type="button"
                        onClick={() => setActualTarget({ dayIndex, slotKey: slot.key })}
                        className="main-btn font-title font-bold text-12 px-10 py-5 self-start text-neutral-500"
                      >
                        + Log what you ate
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(() => {
                const totals = dayTotalMacros(day)
                const hasAnything = totals.calories > 0
                if (!hasAnything) return null
                return (
                  <div className="main-btn p-15 flex flex-col gap-5">
                    <span className="text-14 font-title font-bold uppercase">
                      {Math.round(totals.calories).toLocaleString('en-US')} KCAL
                    </span>
                    <span className="text-14 font-title text-neutral-500">Protein {Math.round(totals.protein)}g</span>
                    <span className="text-14 font-title text-neutral-500">Carbs: {Math.round(totals.carbs)}g</span>
                    <span className="text-14 font-title text-neutral-500">Fat: {Math.round(totals.fat)}g</span>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      </div>

      {pendingConfirm && (
        <ConfirmModal
          message={pendingConfirm.message}
          confirmLabel={pendingConfirm.confirmLabel}
          onConfirm={() => {
            pendingConfirm.onConfirm()
            setPendingConfirm(null)
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {suggestTarget && suggestCurrentRecipe && (
        <SuggestAlternativesModal
          current={suggestCurrentRecipe}
          alternatives={getAlternatives(suggestCurrentRecipe, suggestTarget.slotKey)}
          ingredientCatalog={ingredientCatalog}
          onSelect={(newId) => {
            replaceRecipeInSlot(suggestTarget.dayIndex, suggestTarget.slotKey, suggestTarget.recipeIndex, newId)
            setSuggestTarget(null)
          }}
          onClose={() => setSuggestTarget(null)}
        />
      )}

      {actualTarget && (
        <ActualEntryModal
          slotLabel={SLOTS.find((s) => s.key === actualTarget.slotKey)?.label ?? ''}
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          initial={activeWeek.days[actualTarget.dayIndex]?.actual[actualTarget.slotKey] ?? null}
          onSave={(entry) => {
            setActualEntry(actualTarget.dayIndex, actualTarget.slotKey, entry)
            setActualTarget(null)
          }}
          onDelete={() => {
            clearActualEntry(actualTarget.dayIndex, actualTarget.slotKey)
            setActualTarget(null)
          }}
          onClose={() => setActualTarget(null)}
        />
      )}
    </div>
  )
}

type SlotPickerProps = {
  recipes: Recipe[]
  onAdd: (recipeIds: string[]) => void
}

function SlotPicker({ recipes, onAdd }: SlotPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-white border-2 border-black pl-10 pr-10 py-5 text-14 text-black font-title font-bold flex items-center justify-between hover:bg-neutral-100 w-full"
      >
        Select…
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1V13M1 7H13" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <RecipePickerModal
          recipes={recipes}
          onSave={(recipeIds) => {
            onAdd(recipeIds)
            setIsOpen(false)
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default Calendar
