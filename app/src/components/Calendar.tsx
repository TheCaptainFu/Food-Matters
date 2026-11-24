import PlanWizard from './PlanWizard'
import { costPerServing, loadPlanPrefs, prefsPenalty, type PlanPrefs } from '../recipeTraits'
import { loadHousehold } from '../shopping'
import { dayInfo } from '../greekCalendar'
import { findDef } from '../quantities'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Day, IngredientDef, Recipe, SlotKey, Week } from '../types'
import { SLOT_KEYS } from '../types'
import type { Macros, Profile } from '../nutrition'
import { calculateMacroTargets, recipeMacros } from '../nutrition'
import { isRecipeFasting, isRecipeFastingWithFish, filterCompatibleRecipes } from '../dietaryRestrictions'
import { addDays, allExtras, dayDate, formatDayDate, makeWeek, mondayOf, parseISODate, sortWeeks, toISODate, todayISO } from '../weekUtils'
import ConfirmModal from './ConfirmModal'
import AddRecipeModal from './AddRecipeModal'
import RecipePickerModal from './RecipePickerModal'
import SuggestAlternativesModal from './SuggestAlternativesModal'
import Toast, { type ToastData } from './Toast'
import { downloadWeekTemplate, importWeekFromExcel } from '../excelImport'

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
const slotLabel = (key: SlotKey) => SLOT_KEYS.find((s) => s.value === key)?.label ?? key
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: slotLabel('breakfast'), badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: slotLabel('lunch'), badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: slotLabel('afternoon'), badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: slotLabel('dinner'), badge: 'bg-main-blue text-white' },
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
  // The shown week's Monday ("YYYY-MM-DD").
  activeWeekStart: string
  setActiveWeekStart: (startDate: string) => void
  onOpenProfile: () => void
  // For "Create new recipe" from the Swap dialog.
  onAddRecipe: (recipe: Recipe) => void
  onAddIngredientDef: (def: IngredientDef) => void
  // Opens the "plan my week" questions right away (from Σήμερα).
  startWithPlanWizard?: boolean
  onPlanWizardClosed?: () => void
}

type PendingConfirm = {
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

type SuggestTarget = { dayIndex: number; slotKey: SlotKey; recipeIndex: number }

function Calendar({
  recipes,
  ingredientCatalog,
  profile,
  onOpenRecipe,
  weeks,
  setWeeks,
  activeWeekStart,
  setActiveWeekStart,
  onOpenProfile,
  onAddRecipe,
  onAddIngredientDef,
  startWithPlanWizard = false,
  onPlanWizardClosed,
}: CalendarProps) {
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [suggestTarget, setSuggestTarget] = useState<SuggestTarget | null>(null)
  // The meal a brand-new recipe will replace once it's saved.
  const [createTarget, setCreateTarget] = useState<SuggestTarget | null>(null)
  // The recipe being moved with "Move to…" — the touch-friendly way to move
  // a meal (drag & drop only works with a mouse).
  const [moveTarget, setMoveTarget] = useState<SuggestTarget | null>(null)
  // The week is read-only by default so the plan stays easy to scan; one
  // Edit button reveals the add/swap/remove controls on every day.
  const [isEditing, setIsEditing] = useState(false)
  const [isPlanWizardOpen, setIsPlanWizardOpen] = useState(startWithPlanWizard)

  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  function showToast(data: Omit<ToastData, 'id'>) {
    // A fresh id per toast restarts its auto-hide timer even for repeated text.
    setToast((prev) => ({ ...data, id: (prev?.id ?? 0) + 1 }))
  }

  // The days row has no visible scrollbar, so ‹ › buttons page through it
  // for mouse users (touch and trackpads can just swipe).
  const daysRowRef = useRef<HTMLDivElement>(null)
  // Moves exactly one day: lines up the next/previous card with the left
  // edge, based on whichever card is currently first in view.
  function scrollDays(direction: 1 | -1) {
    const row = daysRowRef.current
    if (!row) return
    const cards = Array.from(row.children) as HTMLElement[]
    const lefts = cards.map((card) => card.offsetLeft - row.offsetLeft - 20)
    const current = lefts.findIndex((left) => left >= row.scrollLeft - 5)
    const target = Math.min(cards.length - 1, Math.max(0, (current === -1 ? cards.length - 1 : current) + direction))
    row.scrollTo({ left: lefts[target], behavior: 'smooth' })
  }

  // Click-and-drag to scroll the days with a mouse (touch already swipes).
  // Starts only past a few pixels of movement, so plain clicks on recipes
  // and buttons still work; skipped on draggable recipes, which in Edit mode
  // are dragged between meals instead.
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)
  const [isDraggingDays, setIsDraggingDays] = useState(false)

  function handleDaysPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    if ((e.target as HTMLElement).closest('[draggable="true"], input, select, textarea')) return
    dragRef.current = { startX: e.clientX, startScroll: e.currentTarget.scrollLeft, moved: false }
  }

  function handleDaysPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) < 5) return
    if (!drag.moved) {
      drag.moved = true
      setIsDraggingDays(true)
    }
    e.currentTarget.scrollLeft = drag.startScroll - dx
  }

  function endDaysDrag() {
    if (!dragRef.current) return
    // Keep "moved" until the click that follows this mouseup has been
    // swallowed (see onClickCapture), then forget the drag.
    const wasMoved = dragRef.current.moved
    setIsDraggingDays(false)
    if (!wasMoved) dragRef.current = null
    else window.setTimeout(() => (dragRef.current = null), 0)
  }

  function handleDaysClickCapture(e: React.MouseEvent) {
    if (dragRef.current?.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

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
  // With a date, also respects the Orthodox fast for that day when the
  // profile follows it (falling back to the unfiltered list if no recipe
  // fits, rather than offering nothing).
  function recipesForSlot(slotKey: SlotKey, date?: Date): Recipe[] {
    // Guard against recipes saved before mealTypes existed (no field on
    // them yet) — treat those as fitting every slot rather than crashing.
    const tagged = compatibleRecipes.filter((r) => (r.mealTypes ?? []).includes(slotKey))
    const pool = tagged.length > 0 ? tagged : compatibleRecipes
    if (!date || !profile?.observesFasting) return pool
    const info = dayInfo(date)
    if (!info.fasting) return pool
    const fasting = pool.filter(info.fishAllowed ? isRecipeFastingWithFish : isRecipeFasting)
    return fasting.length > 0 ? fasting : pool
  }

  // The shown week is picked by date with ‹ › arrows, not from a growing
  // row of tabs. A week nobody has planned yet isn't stored: it's shown
  // empty, and saved the first time something is added to it.
  const storedWeek = weeks.find((w) => w.startDate === activeWeekStart) ?? null
  const emptyWeek = useMemo(() => makeWeek(activeWeekStart), [activeWeekStart])
  const activeWeek = storedWeek ?? emptyWeek
  const thisWeekStart = toISODate(mondayOf(new Date()))
  const weekOffset = Math.round(
    (parseISODate(activeWeekStart).getTime() - parseISODate(thisWeekStart).getTime()) / (7 * 86_400_000),
  )
  const weekHint =
    weekOffset === 0
      ? 'Αυτή η εβδομάδα'
      : weekOffset === 1
        ? 'Επόμενη εβδομάδα'
        : weekOffset === -1
          ? 'Προηγούμενη εβδομάδα'
          : weekOffset > 0
            ? `Σε ${weekOffset} εβδομάδες`
            : `Πριν από ${-weekOffset} εβδομάδες`

  // Entering the page (or switching back to the current week) starts the
  // days row at today, so the day you care about is the first one you see.
  useEffect(() => {
    const row = daysRowRef.current
    if (!row) return
    const todayIndex = Math.round(
      (parseISODate(todayISO()).getTime() - parseISODate(activeWeekStart).getTime()) / 86_400_000,
    )
    if (todayIndex < 0 || todayIndex > 6) {
      row.scrollLeft = 0
      return
    }
    const card = row.children[todayIndex] as HTMLElement | undefined
    if (card) row.scrollLeft = card.offsetLeft - row.offsetLeft - 20
  }, [activeWeekStart])

  function goToWeek(offset: number) {
    setActiveWeekStart(toISODate(addDays(parseISODate(activeWeekStart), offset * 7)))
  }

  // Applies a change to the week starting on startDate — creating it first
  // if it's one of the empty, not-yet-saved weeks.
  function updateWeekAt(startDate: string, update: (week: Week) => Week) {
    setWeeks((prev) => {
      const existing = prev.find((w) => w.startDate === startDate)
      if (existing) return prev.map((w) => (w === existing ? update(w) : w))
      return sortWeeks([...prev, update(makeWeek(startDate))])
    })
  }

  function updateDay(dayIndex: number, update: (day: Day) => Day) {
    updateWeekAt(activeWeekStart, (week) => ({
      ...week,
      days: week.days.map((day, i) => (i === dayIndex ? update(day) : day)),
    }))
  }

  const weekHasMeals = activeWeek.days.some((day) => SLOTS.some((slot) => day.slots[slot.key].length > 0))

  // Imports into the week on screen. Logged meals are kept; only the plan
  // is replaced, and only after asking if there's a plan to lose.
  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsImporting(true)
    try {
      const startDate = activeWeekStart
      const { week: imported, skipped } = await importWeekFromExcel(file, recipes, startDate)
      const apply = () => {
        updateWeekAt(startDate, (week) => ({
          ...week,
          days: week.days.map((day, i) => ({ ...day, slots: imported.days[i]?.slots ?? day.slots })),
        }))
        showToast(
          skipped.length > 0
            ? {
                message: `Έγινε εισαγωγή: ${imported.label}. Αυτές οι συνταγές δεν βρέθηκαν στις Συνταγές σου και παραλείφθηκαν:\n${skipped.join(', ')}`,
              }
            : { message: `Έγινε εισαγωγή: ${imported.label}.`, autoHideMs: 4000 },
        )
      }
      if (weekHasMeals) {
        setPendingConfirm({
          message: `Να αντικατασταθούν τα γεύματα της εβδομάδας ${imported.label} με αυτά του αρχείου;`,
          confirmLabel: 'Αντικατάσταση',
          onConfirm: apply,
        })
      } else {
        apply()
      }
    } catch {
      showToast({
        tone: 'error',
        message: 'Δεν ήταν δυνατή η ανάγνωση του αρχείου. Βεβαιώσου ότι είναι .xlsx, .xls ή .csv από το πρότυπο που κατέβασες.',
      })
    } finally {
      setIsImporting(false)
    }
  }

  function clearWeek() {
    if (!storedWeek) return
    const startDate = activeWeekStart
    setPendingConfirm({
      message: `Άδειασμα εβδομάδας ${activeWeek.label}; Θα διαγραφούν τα γεύματά της και ό,τι έχεις καταγράψει. Δεν αναιρείται.`,
      confirmLabel: 'Άδειασμα',
      onConfirm: () => setWeeks((prev) => prev.filter((w) => w.startDate !== startDate)),
    })
  }

  function addRecipesToSlot(dayIndex: number, slotKey: SlotKey, recipeIds: string[]) {
    updateDay(dayIndex, (day) => ({
      ...day,
      slots: { ...day.slots, [slotKey]: [...day.slots[slotKey], ...recipeIds] },
    }))
  }

  function moveRecipe(
    from: { dayIndex: number; slotKey: SlotKey; recipeIndex: number },
    to: { dayIndex: number; slotKey: SlotKey },
  ) {
    updateWeekAt(activeWeekStart, (week) => {
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
    })
  }

  // Removes straight away (we're already in Edit mode, so a confirm on every
  // ✕ is just friction) and offers Undo instead.
  function removeRecipeFromSlot(dayIndex: number, slotKey: SlotKey, recipeIndex: number) {
    const startDate = activeWeekStart
    const recipeId = activeWeek.days[dayIndex]?.slots[slotKey][recipeIndex]
    if (!recipeId) return
    const updateSlot = (update: (ids: string[]) => string[]) =>
      updateWeekAt(startDate, (week) => ({
        ...week,
        days: week.days.map((day, i) =>
          i !== dayIndex ? day : { ...day, slots: { ...day.slots, [slotKey]: update(day.slots[slotKey]) } },
        ),
      }))

    updateSlot((ids) => ids.filter((_, idx) => idx !== recipeIndex))
    const title = recipes.find((r) => r.id === recipeId)?.title ?? 'Συνταγή'
    showToast({
      message: `Αφαιρέθηκε: ${title}.`,
      autoHideMs: 5000,
      action: {
        label: 'Αναίρεση',
        onClick: () => updateSlot((ids) => [...ids.slice(0, recipeIndex), recipeId, ...ids.slice(recipeIndex)]),
      },
    })
  }

  function replaceRecipeInSlot(dayIndex: number, slotKey: SlotKey, recipeIndex: number, newRecipeId: string) {
    updateDay(dayIndex, (day) => ({
      ...day,
      slots: {
        ...day.slots,
        [slotKey]: day.slots[slotKey].map((id, idx) => (idx === recipeIndex ? newRecipeId : id)),
      },
    }))
  }

  // Top 3 recipes in the same category (and still fit for that meal) whose
  // full macro profile (calories, protein, carbs, fat) is closest to the
  // given recipe's — candidates for an "I don't feel like this one" swap
  // that doesn't throw off the day's targets.
  function getAlternatives(current: Recipe, slotKey: SlotKey, date?: Date): Recipe[] {
    const currentMacros = recipeMacros(current, ingredientCatalog)
    const byCloseness = (list: Recipe[]) =>
      [...list].sort(
        (a, b) =>
          macroDistance(recipeMacros(a, ingredientCatalog), currentMacros) -
          macroDistance(recipeMacros(b, ingredientCatalog), currentMacros),
      )
    const isSupplement = (r: Recipe) =>
      r.ingredients.some((ing) => findDef(ing.name, ingredientCatalog)?.category === 'protein')
    const others = recipesForSlot(slotKey, date).filter((r) => r.id !== current.id && !isSupplement(r))
    // Same kind of dish first; if there aren't 3 of those for this meal,
    // top up with the closest of the rest, so there's always a choice.
    const sameKind = byCloseness(others.filter((r) => r.category === current.category))
    const rest = byCloseness(others.filter((r) => r.category !== current.category))
    return [...sameKind, ...rest].slice(0, 3)
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
      // Extra food logged outside the four meals counts toward the day too.
      allExtras(day).reduce<Macros>(
        (sum, e) => ({
          calories: sum.calories + e.calories,
          protein: sum.protein + e.protein,
          carbs: sum.carbs + e.carbs,
          fat: sum.fat + e.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
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
    date: Date,
    prefs: PlanPrefs = loadPlanPrefs(),
  ): Partial<Record<SlotKey, Recipe>> {
    const weekday = date.getDay()
    const isWeekday = weekday >= 1 && weekday <= 5
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
        macroDistance(recipeMacros(r, ingredientCatalog), slotBudget) +
        (usageCounts.get(r.id) ?? 0) * REPEAT_PENALTY +
        prefsPenalty(r, ingredientCatalog, prefs, isWeekday)
      // Supplements (shake, protein bar) aren't meals — the plan suggests a
      // shake separately — so auto-fill leaves them out unless nothing else fits.
      const pool = recipesForSlot(slot.key, date)
      const meals = pool.filter(
        (r) => !r.ingredients.some((ing) => findDef(ing.name, ingredientCatalog)?.category === 'protein'),
      )
      const ranked = [...(meals.length > 0 ? meals : pool)].sort((a, b) => score(a) - score(b))
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
    const picks = pickFillsForDay(day.slots, usageCounts, dayDate(activeWeek, dayIndex))

    SLOTS.forEach((slot) => {
      const recipe = picks[slot.key]
      if (!recipe) return
      usageCounts.set(recipe.id, (usageCounts.get(recipe.id) ?? 0) + 1)
      addRecipesToSlot(dayIndex, slot.key, [recipe.id])
    })
  }

  const weekHasEmptySlot = activeWeek.days.some((day) => SLOTS.some((slot) => day.slots[slot.key].length === 0))

  // Fills only the empty meals of the week, leaving anything already
  // planned (by hand or by an earlier fill) untouched — so it's always safe
  // to press. Each day is balanced around what's already in it.
  // The button asks a few questions first (budget, time, likes…); a full
  // week needs no questions, just says so.
  function openPlanWizard() {
    if (dailyMacroTargets === null) return
    if (!weekHasEmptySlot) {
      showToast({ message: 'Όλα τα γεύματα της εβδομάδας είναι ήδη προγραμματισμένα.', autoHideMs: 4000 })
      return
    }
    setIsPlanWizardOpen(true)
  }

  function closePlanWizard() {
    setIsPlanWizardOpen(false)
    onPlanWizardClosed?.()
  }

  function fillWeek(prefs: PlanPrefs) {
    if (dailyMacroTargets === null) return
    // Seed with what's already planned so fills favor variety around it.
    const usageCounts = new Map<string, number>()
    activeWeek.days.forEach((day) =>
      SLOTS.forEach((slot) =>
        day.slots[slot.key].forEach((id) => usageCounts.set(id, (usageCounts.get(id) ?? 0) + 1)),
      ),
    )
    const filledDays = activeWeek.days.map((day, i) => {
      const picks = pickFillsForDay(day.slots, usageCounts, dayDate(activeWeek, i), prefs)
      const slots = { ...day.slots }
      SLOTS.forEach((slot) => {
        const recipe = picks[slot.key]
        if (!recipe) return
        usageCounts.set(recipe.id, (usageCounts.get(recipe.id) ?? 0) + 1)
        slots[slot.key] = [recipe.id]
      })
      return { ...day, slots }
    })

    // "Cook once, eat twice": a dinner this fill chose becomes tomorrow's
    // lunch, if that lunch was empty too — one pot, two meals.
    let leftovers = 0
    if (prefs.cookTwice) {
      for (let i = 0; i < 6; i++) {
        const dinnerWasEmpty = activeWeek.days[i].slots.dinner.length === 0
        const nextLunchWasEmpty = activeWeek.days[i + 1].slots.lunch.length === 0
        const dinner = filledDays[i].slots.dinner
        if (dinnerWasEmpty && nextLunchWasEmpty && dinner.length > 0) {
          filledDays[i + 1] = { ...filledDays[i + 1], slots: { ...filledDays[i + 1].slots, lunch: [...dinner] } }
          leftovers++
        }
      }
    }

    updateWeekAt(activeWeekStart, (week) => ({
      ...week,
      days: week.days.map((day, i) => ({ ...day, slots: filledDays[i].slots })),
    }))

    // Rough cost of the whole week's food, for everyone in the household.
    const people = loadHousehold()
    const cost = filledDays.reduce(
      (sum, day) =>
        sum +
        SLOTS.reduce(
          (s, slot) =>
            s +
            day.slots[slot.key].reduce((t, id) => {
              const r = recipes.find((x) => x.id === id)
              return r ? t + costPerServing(r, ingredientCatalog) : t
            }, 0),
          0,
        ),
      0,
    )
    showToast({
      message: `Έτοιμη η εβδομάδα! 🍽 Εκτιμώμενο κόστος: ~${Math.round(cost * people)}€${
        people > 1 ? ` για ${people} άτομα` : ''
      }${leftovers > 0 ? ` · ${leftovers} φορές τρως από την κατσαρόλα της προηγούμενης μέρας` : ''}.`,
      autoHideMs: 7000,
    })
  }

  // Throws away the whole week's plan and builds a new one from scratch —
  // the destructive version, kept in the ⋯ menu and behind a confirm.
  function replanWeek() {
    if (dailyMacroTargets === null) return
    setPendingConfirm({
      message: `Νέο πρόγραμμα για την εβδομάδα ${activeWeek.label}; Θα αντικατασταθούν και τα γεύματα που διάλεξες εσύ. Δεν αναιρείται.`,
      confirmLabel: 'Νέο πρόγραμμα',
      onConfirm: () => {
        const usageCounts = new Map<string, number>()
        const emptySlots: Day['slots'] = { breakfast: [], lunch: [], afternoon: [], dinner: [] }
        const newSlots = activeWeek.days.map((_, i) => {
          const picks = pickFillsForDay(emptySlots, usageCounts, dayDate(activeWeek, i), loadPlanPrefs())
          const slots: Day['slots'] = { breakfast: [], lunch: [], afternoon: [], dinner: [] }
          SLOTS.forEach((slot) => {
            const recipe = picks[slot.key]
            if (!recipe) return
            usageCounts.set(recipe.id, (usageCounts.get(recipe.id) ?? 0) + 1)
            slots[slot.key] = [recipe.id]
          })
          return slots
        })
        updateWeekAt(activeWeekStart, (week) => ({
          ...week,
          days: week.days.map((day, i) => ({ ...day, slots: newSlots[i] })),
        }))
      },
    })
  }

  const suggestCurrentRecipeId = suggestTarget
    ? activeWeek.days[suggestTarget.dayIndex]?.slots[suggestTarget.slotKey][suggestTarget.recipeIndex]
    : null
  const suggestCurrentRecipe = suggestCurrentRecipeId
    ? (recipes.find((r) => r.id === suggestCurrentRecipeId) ?? null)
    : null

  const today = todayISO()

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-20">
        <div className="flex flex-col gap-5">
          <h2 className="text-26 font-title font-bold uppercase">Πρόγραμμα</h2>
          <p className="text-14 font-title text-neutral-500">
            Πάτα Επεξεργασία για να αλλάξεις γεύματα ή Συμπλήρωση εβδομάδας για να γεμίσουν αυτόματα τα κενά.
          </p>
        </div>

        {!profile && (
          <div className="bg-main-yellow border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-wrap items-center justify-between gap-10">
            <span className="text-14 font-title font-bold">
              Φτιάξε το προφίλ σου για να βλέπεις τους ημερήσιους στόχους θερμίδων και να γεμίζεις την εβδομάδα αυτόματα.
            </span>
            <button type="button" onClick={onOpenProfile} className="main-btn font-title font-bold px-15 py-10">
              Φτιάξε το προφίλ σου
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-10">
          <div className="flex flex-wrap items-center gap-10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => goToWeek(-1)}
              aria-label="Προηγούμενη εβδομάδα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
            >
              ‹
            </button>
            <h3 className="text-20 font-title font-bold uppercase flex flex-wrap items-baseline gap-x-10 min-w-0 flex-1 pl-10 sm:flex-none sm:min-w-[220px]">
              {weekHint}
              <span className="text-14 font-normal normal-case text-neutral-500">{activeWeek.label}</span>
            </h3>
            <button
              type="button"
              onClick={() => goToWeek(1)}
              aria-label="Επόμενη εβδομάδα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
            >
              ›
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setActiveWeekStart(thisWeekStart)}
                className="text-14 font-title font-bold underline cursor-pointer ml-5"
              >
                Πίσω σε αυτή την εβδομάδα
              </button>
            )}
          </div>

          <div className="flex gap-10">
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className={
                isEditing
                  ? 'main-btn font-title font-bold px-15 py-10 bg-main-blue text-white'
                  : 'main-btn font-title font-bold px-15 py-10'
              }
            >
              {isEditing ? 'Τέλος' : 'Επεξεργασία'}
            </button>
            <button
              type="button"
              onClick={openPlanWizard}
              disabled={dailyTarget === null}
              title={
                dailyTarget === null
                  ? 'Φτιάξε πρώτα το προφίλ σου'
                  : 'Γέμισε τα κενά γεύματα της εβδομάδας με βάση τους ημερήσιους στόχους σου (τα υπάρχοντα μένουν)'
              }
              className="main-btn whitespace-nowrap font-title font-bold px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="sm:hidden">Συμπλήρωση</span>
              <span className="hidden sm:inline">Συμπλήρωση εβδομάδας</span>
            </button>
            <WeekMenu
              isImporting={isImporting}
              canClear={!!storedWeek}
              canReplan={dailyTarget !== null && weekHasMeals}
              onReplan={replanWeek}
              onDownloadTemplate={() => downloadWeekTemplate(recipes)}
              onImport={handleImportExcel}
              onClear={clearWeek}
            />
          </div>
        </div>

        {isEditing && (
          <div className="bg-main-blue text-white border-3 border-black px-15 py-10">
            <span className="text-14 font-title font-bold">
              Επεξεργασία: πρόσθεσε, άλλαξε, αφαίρεσε ή σύρε γεύματα. Οι αλλαγές αποθηκεύονται αυτόματα.
            </span>
          </div>
        )}

        <div className="hidden sm:flex justify-end gap-10 -mb-10">
          <button
            type="button"
            onClick={() => scrollDays(-1)}
            aria-label="Προηγούμενη μέρα"
            className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollDays(1)}
            aria-label="Επόμενη μέρα"
            className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
          >
            ›
          </button>
        </div>

        <div
          ref={daysRowRef}
          onPointerDown={handleDaysPointerDown}
          onPointerMove={handleDaysPointerMove}
          onPointerUp={endDaysDrag}
          onPointerLeave={endDaysDrag}
          onClickCapture={handleDaysClickCapture}
          className={
            isDraggingDays
              ? 'flex gap-20 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grabbing pt-5 pb-20 -mx-20 px-20'
              : 'flex gap-20 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x touch-pan-y snap-x snap-proximity cursor-grab pt-5 pb-20 -mx-20 px-20 scroll-px-20'
          }
        >
          {activeWeek.days.map((day, dayIndex) => {
            const date = dayDate(activeWeek, dayIndex)
            const isToday = toISODate(date) === today
            // Past days are dimmed to keep the eye on today — but not while editing,
            // when every day needs to be fully readable.
            const isPast = !isEditing && toISODate(date) < today
            const totals = dayTotalMacros(day)
            const hasEmptySlot = SLOTS.some((slot) => day.slots[slot.key].length === 0)
            const calendarInfo = dayInfo(date)
            // Fasting badges only for people who keep the fasts; feasts for everyone.
            const showFast = !!profile?.observesFasting && calendarInfo.fasting

            return (
              <div
                key={day.label}
                className={
                  isToday
                    ? 'bg-white border-3 border-main-blue shadow-[4px_4px_0_0_#5e81d1] flex flex-col gap-15 p-20 shrink-0 w-[85vw] sm:w-[300px] snap-start'
                    : isPast
                      ? 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col gap-15 p-20 shrink-0 w-[85vw] sm:w-[300px] snap-start opacity-50 hover:opacity-100 transition-opacity'
                      : 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col gap-15 p-20 shrink-0 w-[85vw] sm:w-[300px] snap-start'
                }
              >
                <div className="flex items-center justify-between gap-10">
                  <h3 className="font-title font-bold uppercase text-18 flex items-center gap-10">
                    {day.label}
                    <span className="text-14 font-normal normal-case text-neutral-500">{formatDayDate(date)}</span>
                    {isToday && (
                      <span className="bg-main-blue text-white text-12 px-5 py-[2px] normal-case">Σήμερα</span>
                    )}
                  </h3>
                  {isEditing && dailyTarget !== null && hasEmptySlot && (
                      <button
                        type="button"
                        onClick={() => autoFillDay(dayIndex)}
                        title="Γέμισε τα κενά γεύματα της μέρας με βάση τον ημερήσιο στόχο σου"
                        className="main-btn font-title font-bold px-10 py-5 text-12"
                      >
                        Συμπλήρωση
                      </button>
                    )}
                </div>

                {(calendarInfo.feast || showFast || calendarInfo.reason?.startsWith('Τυροφάγου')) && (
                  <div className="flex flex-wrap gap-5 -mt-5">
                    {calendarInfo.feast && (
                      <span className="px-5 py-[2px] text-12 font-title font-bold bg-main-yellow border-2 border-black">
                        🎉 {calendarInfo.feast}
                      </span>
                    )}
                    {showFast && (
                      <span
                        title={calendarInfo.reason}
                        className="px-5 py-[2px] text-12 font-title font-bold bg-white border-2 border-black"
                      >
                        ✝ Νηστεία{calendarInfo.fishAllowed ? ' · επιτρέπεται ψάρι' : ''}
                        {calendarInfo.reason && !calendarInfo.feast ? ` · ${calendarInfo.reason}` : ''}
                      </span>
                    )}
                    {!!profile?.observesFasting && calendarInfo.reason?.startsWith('Τυροφάγου') && (
                      <span className="px-5 py-[2px] text-12 font-title font-bold bg-white border-2 border-black">
                        🧀 {calendarInfo.reason}
                      </span>
                    )}
                  </div>
                )}

                <DayProgress
                  totals={totals}
                  targets={dailyMacroTargets}
                  takesProtein={!!profile?.takesProtein}
                />

                {SLOTS.map((slot) => {
                  const dropKey = `${dayIndex}-${slot.key}`
                  const entry = day.actual[slot.key]
                  // Eaten exactly as planned — flagged by "✓ Ate this", or (for
                  // entries logged before that flag existed) same name as the plan.
                  const plannedTitles = day.slots[slot.key]
                    .map((id) => recipes.find((r) => r.id === id)?.title)
                    .filter(Boolean)
                    .join(', ')
                  const eatenAsPlanned =
                    !!entry && (!!entry.fromPlan || (plannedTitles !== '' && entry.description === plannedTitles))
                  return (
                    <div
                      key={slot.key}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOverKey(dropKey)
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
                        dragOverKey === dropKey
                          ? 'flex flex-col gap-10 pt-15 border-t border-neutral-200 bg-main-yellow/20 outline-3 outline-dashed outline-black -outline-offset-2'
                          : 'flex flex-col gap-10 pt-15 border-t border-neutral-200'
                      }
                    >
                      <div className="flex items-center justify-between gap-10">
                        <span
                          className={`inline-block px-5 py-[2px] text-12 font-title font-bold uppercase border-2 border-black ${slot.badge}`}
                        >
                          {slot.label}
                        </span>
                        {isEditing && day.slots[slot.key].length > 0 && (
                          <SlotPicker
                            compact
                            recipes={recipesForSlot(slot.key, date)}
                            onAdd={(recipeIds) => addRecipesToSlot(dayIndex, slot.key, recipeIds)}
                          />
                        )}
                      </div>

                      {/* Eaten exactly as planned: the log row below says it all —
                          don't also list the same recipe struck through. */}
                      {!(eatenAsPlanned && !isEditing) && day.slots[slot.key].map((recipeId, recipeIndex) => {
                        const recipe = recipes.find((r) => r.id === recipeId)
                        if (!recipe) return null
                        return (
                          <div
                            key={recipeIndex}
                            draggable={isEditing}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({ dayIndex, slotKey: slot.key, recipeIndex }),
                              )
                            }}
                            className={
                              entry && !eatenAsPlanned
                                ? 'flex items-center justify-between gap-5 bg-white border-2 border-black px-10 py-5 opacity-50 line-through'
                                : isEditing
                                  ? 'flex items-center justify-between gap-5 bg-white border-2 border-black px-10 py-5 cursor-grab active:cursor-grabbing hover:bg-neutral-50'
                                  : 'flex items-center justify-between gap-5 bg-white border-2 border-black px-10 py-5'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => onOpenRecipe(recipe.id)}
                              className="text-14 text-black font-title font-bold text-left hover:underline cursor-pointer"
                            >
                              {recipe.title}
                            </button>
                            {isEditing && (
                            <div className="flex items-center gap-10 shrink-0">
                              <button
                                type="button"
                                onClick={() => setMoveTarget({ dayIndex, slotKey: slot.key, recipeIndex })}
                                aria-label="Μετακίνηση σε άλλη μέρα ή γεύμα"
                                title="Μετακίνηση σε άλλη μέρα ή γεύμα"
                                className="text-black hover:text-main-blue font-bold text-14 leading-none cursor-pointer"
                              >
                                ↗
                              </button>
                              <button
                                type="button"
                                onClick={() => setSuggestTarget({ dayIndex, slotKey: slot.key, recipeIndex })}
                                aria-label="Αλλαγή με παρόμοια συνταγή"
                                title="Αλλαγή με παρόμοια συνταγή"
                                className="text-black hover:text-main-blue font-bold text-14 leading-none cursor-pointer"
                              >
                                ⇄
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRecipeFromSlot(dayIndex, slot.key, recipeIndex)}
                                aria-label="Αφαίρεση"
                                title="Αφαίρεση"
                                className="text-black hover:text-main-red font-bold text-14 leading-none cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            )}
                          </div>
                        )
                      })}

                      {/* What was actually eaten — shown here for context, but
                          logged and edited on the Calories page. */}
                      {entry && (
                        <div
                          title="Τι έφαγες τελικά (καταγραφή και αλλαγές στη σελίδα Θερμίδες)"
                          className="flex items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5"
                        >
                          <span className="flex items-center gap-10 min-w-0">
                            {entry.photo ? (
                              <img src={entry.photo} alt="" className="w-20 h-20 object-cover border border-black shrink-0" />
                            ) : (
                              <span className="font-bold text-14 leading-none shrink-0">✓</span>
                            )}
                            <span className="text-14 font-title font-bold">{entry.description}</span>
                          </span>
                          <span className="text-12 font-title text-neutral-600 whitespace-nowrap">
                            {Math.round(entry.calories)} kcal
                          </span>
                        </div>
                      )}

                      {!isEditing && day.slots[slot.key].length === 0 && !entry && (
                        <span className="text-12 font-title text-neutral-400">Δεν έχει προγραμματιστεί</span>
                      )}

                      {isEditing && day.slots[slot.key].length === 0 && (
                        <SlotPicker
                          recipes={recipesForSlot(slot.key, date)}
                          onAdd={(recipeIds) => addRecipesToSlot(dayIndex, slot.key, recipeIds)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {isPlanWizardOpen && (
        <PlanWizard
          onClose={closePlanWizard}
          onDone={(prefs) => {
            fillWeek(prefs)
            closePlanWizard()
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}

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
          alternatives={getAlternatives(suggestCurrentRecipe, suggestTarget.slotKey, dayDate(activeWeek, suggestTarget.dayIndex))}
          allRecipes={compatibleRecipes}
          onCreateNew={() => {
            setCreateTarget(suggestTarget)
            setSuggestTarget(null)
          }}
          ingredientCatalog={ingredientCatalog}
          onSelect={(newId) => {
            replaceRecipeInSlot(suggestTarget.dayIndex, suggestTarget.slotKey, suggestTarget.recipeIndex, newId)
            setSuggestTarget(null)
          }}
          onClose={() => setSuggestTarget(null)}
        />
      )}

      {moveTarget && (
        <MoveRecipeModal
          recipeTitle={
            recipes.find((r) => r.id === activeWeek.days[moveTarget.dayIndex]?.slots[moveTarget.slotKey][moveTarget.recipeIndex])
              ?.title ?? 'Συνταγή'
          }
          days={activeWeek.days.map((day, i) => ({ label: day.label, date: formatDayDate(dayDate(activeWeek, i)) }))}
          from={moveTarget}
          onMove={(to) => {
            moveRecipe(moveTarget, to)
            setMoveTarget(null)
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {createTarget && (
        <AddRecipeModal
          ingredientCatalog={ingredientCatalog}
          onAddIngredientDef={onAddIngredientDef}
          onClose={() => setCreateTarget(null)}
          onBack={() => {
            setSuggestTarget(createTarget)
            setCreateTarget(null)
          }}
          onSave={(recipe) => {
            onAddRecipe(recipe)
            replaceRecipeInSlot(createTarget.dayIndex, createTarget.slotKey, createTarget.recipeIndex, recipe.id)
            setCreateTarget(null)
          }}
        />
      )}

    </div>
  )
}

type DayProgressProps = {
  totals: Macros
  targets: Macros | null
  takesProtein: boolean
}

// The day's running total against the profile's targets, right on the day
// card — so you can see whether a day "works" while planning it, without
// switching to another tab.
function DayProgress({ totals, targets, takesProtein }: DayProgressProps) {
  const kcal = Math.round(totals.calories)

  if (!targets) {
    if (kcal === 0) return null
    return <span className="text-12 font-title font-bold">{kcal} kcal</span>
  }

  const pct = Math.min(100, Math.round((totals.calories / targets.calories) * 100))
  const over = totals.calories > targets.calories * 1.1

  // A protein shake tops up the gap in ~25g scoops, capped at 2 — only once
  // the day has food in it, otherwise the gap is just "the whole target".
  const proteinGap = Math.round(targets.protein - totals.protein)
  const scoops = proteinGap > 0 ? Math.min(2, Math.max(1, Math.round(proteinGap / 25))) : 0
  const showShake = takesProtein && kcal > 0 && scoops > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-10 text-12 font-title">
        <span className={over ? 'font-bold text-main-red' : 'font-bold'}>
          {kcal} / {targets.calories} kcal
        </span>
        {showShake && (
          <span
            className="text-neutral-500 whitespace-nowrap"
            title={`Σου λείπουν περίπου ${proteinGap}g πρωτεΐνης — καλύπτονται με ${scoops === 1 ? '1 μεζούρα' : `${scoops} μεζούρες`} σέικ πρωτεΐνης`}
          >
            💊 +{scoops} σέικ
          </span>
        )}
      </div>
      <div className="w-full h-10 border-2 border-black bg-neutral-100">
        <div className={over ? 'h-full bg-main-red' : 'h-full bg-main-blue'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

type WeekMenuProps = {
  isImporting: boolean
  canClear: boolean
  canReplan: boolean
  onReplan: () => void
  onDownloadTemplate: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

// The less common week actions, tucked behind "⋯" so the toolbar has one
// obvious main action (Fill Week) instead of five equal-looking buttons.
function WeekMenu({ isImporting, canClear, canReplan, onReplan, onDownloadTemplate, onImport, onClear }: WeekMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const itemClass =
    'text-left px-10 py-10 font-title font-bold text-14 hover:bg-neutral-100 cursor-pointer disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Περισσότερες επιλογές εβδομάδας"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="main-btn font-title font-bold px-15 py-10"
      >
        {isImporting ? 'Εισαγωγή…' : '⋯'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-10 z-20 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col min-w-[220px] p-5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onDownloadTemplate()
              }}
              className={itemClass}
            >
              Λήψη προτύπου Excel
            </button>
            {/* The menu closes only once a file is picked — closing on click
                would unmount the input before the file dialog returns. */}
            <label className={itemClass}>
              Εισαγωγή εβδομάδας από Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  setIsOpen(false)
                  onImport(e)
                }}
                className="hidden"
              />
            </label>
            <div className="border-t border-neutral-200 my-5" />
            <button
              type="button"
              disabled={!canReplan}
              onClick={() => {
                setIsOpen(false)
                onReplan()
              }}
              className={itemClass}
            >
              Νέο πρόγραμμα για όλη την εβδομάδα
            </button>
            <button
              type="button"
              disabled={!canClear}
              onClick={() => {
                setIsOpen(false)
                onClear()
              }}
              className={`${itemClass} text-main-red`}
            >
              Άδειασμα εβδομάδας
            </button>
          </div>
        </>
      )}
    </div>
  )
}

type MoveRecipeModalProps = {
  recipeTitle: string
  days: { label: string; date: string }[]
  from: { dayIndex: number; slotKey: SlotKey }
  onMove: (to: { dayIndex: number; slotKey: SlotKey }) => void
  onClose: () => void
}

// Pick a day and a meal, then Move. Starts on the recipe's current spot.
function MoveRecipeModal({ recipeTitle, days, from, onMove, onClose }: MoveRecipeModalProps) {
  const [dayIndex, setDayIndex] = useState(from.dayIndex)
  const [slotKey, setSlotKey] = useState<SlotKey>(from.slotKey)
  const isSameSpot = dayIndex === from.dayIndex && slotKey === from.slotKey

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-20 w-full max-w-[420px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-5">
          <h2 className="text-20 font-title font-bold uppercase">Μετακίνηση γεύματος</h2>
          <span className="text-14 font-title text-neutral-500">{recipeTitle}</span>
        </div>

        <div className="flex flex-col gap-10">
          <span className="text-14 font-title font-bold uppercase text-neutral-500">Μέρα</span>
          <div className="grid grid-cols-4 gap-10">
            {days.map((day, i) => (
              <button
                key={day.label}
                type="button"
                onClick={() => setDayIndex(i)}
                className={
                  i === dayIndex
                    ? 'main-btn flex flex-col items-center px-5 py-5 font-title bg-main-blue text-white'
                    : 'main-btn flex flex-col items-center px-5 py-5 font-title'
                }
              >
                <span className="text-14 font-bold">{day.label.slice(0, 3)}</span>
                <span className="text-12">{day.date}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-10">
          <span className="text-14 font-title font-bold uppercase text-neutral-500">Γεύμα</span>
          <div className="grid grid-cols-2 gap-10">
            {SLOTS.map((slot) => (
              <button
                key={slot.key}
                type="button"
                onClick={() => setSlotKey(slot.key)}
                className={
                  slot.key === slotKey
                    ? `main-btn font-title font-bold text-14 uppercase px-10 py-10 ${slot.badge}`
                    : 'main-btn font-title font-bold text-14 uppercase px-10 py-10'
                }
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10 mr-auto">
            ← Πίσω
          </button>
          <button
            type="button"
            disabled={isSameSpot}
            onClick={() => onMove({ dayIndex, slotKey })}
            className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
          >
            Μετακίνηση εδώ
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

type SlotPickerProps = {
  recipes: Recipe[]
  onAdd: (recipeIds: string[]) => void
  // Just a small "+" — for a meal that already has a recipe, where a full
  // "+ Add recipe" button on every slot would be noise.
  compact?: boolean
}

function SlotPicker({ recipes, onAdd, compact = false }: SlotPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={compact ? 'Προσθήκη κι άλλης συνταγής' : undefined}
        title={compact ? 'Προσθήκη κι άλλης συνταγής' : undefined}
        className={
          compact
            ? 'text-neutral-500 hover:text-black font-bold text-16 leading-none px-5 cursor-pointer'
            : 'border-2 border-dashed border-neutral-400 hover:border-black px-10 py-5 text-12 text-neutral-600 hover:text-black font-title font-bold cursor-pointer text-left'
        }
      >
        {compact ? '+' : '+ Προσθήκη συνταγής'}
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
