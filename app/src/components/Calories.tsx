import { Fragment, useCallback, useState } from 'react'
import type { ActualEntry, Day, IngredientDef, Recipe, SlotKey, Week } from '../types'
import { calculateMacroTargets, calculateWaterTargetMl, recipeMacros, scaleMacros } from '../nutrition'
import type { Macros, Profile } from '../nutrition'
import {
  addDays,
  allExtras,
  dayDate,
  findDay,
  formatDayDate,
  parseISODate,
  parseSlotEntry,
  portionLabel,
  skippedEntry,
  slotExtras,
  toISODate,
  todayISO,
  weekdayName,
} from '../weekUtils'
import ActualEntryModal from './ActualEntryModal'
import FadeScrollX from './FadeScrollX'
import PortionBadge from './PortionBadge'
import { AmountBadge } from './AmountPicker'
import Chevron from './Chevron'
import Toast, { type ToastData } from './Toast'

const GLASS_ML = 250

type CaloriesProps = {
  onAddRecipe: (recipe: Recipe) => void
  onAddIngredientDef: (def: IngredientDef) => void
  recipes: Recipe[]
  weeks: Week[]
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
  onOpenProfile: () => void
  onGoToCalendar: () => void
  onGoToToday: () => void
}

// badge classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them in this file
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: 'Πρωινό', badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: 'Μεσημεριανό', badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: 'Απογευματινό', badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: 'Βραδινό', badge: 'bg-main-blue text-white' },
]

const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

// How close a value is to its target, as a background tint behind black
// text (coloured text on white — especially the light teal — is hard to read).
function statusClass(actual: number, target: number): string {
  if (target <= 0) return ''
  const diff = Math.abs(actual - target) / target
  if (diff <= 0.1) return 'bg-main-teal/50'
  if (diff <= 0.25) return 'bg-main-orange/40'
  return 'bg-main-red/40'
}

const MACRO_COLUMNS = [
  { key: 'protein', label: 'Πρωτεΐνη', short: 'Π' },
  { key: 'carbs', label: 'Υδατάνθρακες', short: 'Υ' },
  { key: 'fat', label: 'Λιπαρά', short: 'Λ' },
] as const

function Calories({
  onAddRecipe,
  onAddIngredientDef,
  recipes,
  weeks,
  setWeeks,
  ingredientCatalog,
  profile,
  onOpenRecipe,
  onOpenProfile,
  onGoToCalendar,
  onGoToToday,
}: CaloriesProps) {
  const [loggingSlot, setLoggingSlot] = useState<SlotKey | null>(null)
  // Extra food for a meal: index 'new' while adding one, or the one being edited.
  const [loggingExtra, setLoggingExtra] = useState<{ slot: SlotKey; index: number | 'new' } | null>(null)
  // Which week the day-by-day table shows; null = the latest one in History.
  const [tableWeekId, setTableWeekId] = useState<string | null>(null)

  // The day being corrected: yesterday by default, or any earlier day.
  // Today itself is logged on the Today page.
  const [selectedISO, setSelectedISO] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  function showToast(data: Omit<ToastData, 'id'>) {
    setToast((prev) => ({ ...data, id: (prev?.id ?? 0) + 1 }))
  }

  const targets = profile ? calculateMacroTargets(profile) : null
  const today = todayISO()
  const yesterday = toISODate(addDays(parseISODate(today), -1))
  const dayISO = selectedISO && selectedISO < yesterday ? selectedISO : yesterday
  const isToday = false
  const todayRef = findDay(weeks, dayISO)
  const todayDay = todayRef ? todayRef.week.days[todayRef.dayIndex] : null
  const dayTitle = dayISO === yesterday ? 'Χθες' : weekdayName(parseISODate(dayISO))
  const waterTargetMl = profile ? calculateWaterTargetMl(profile) : null

  function plannedMacros(recipeIds: string[]): Macros {
    return recipeIds.reduce((sum, entry) => {
      const { id, portion } = parseSlotEntry(entry)
      const recipe = recipes.find((r) => r.id === id)
      return recipe ? addMacros(sum, scaleMacros(recipeMacros(recipe, ingredientCatalog), portion)) : sum
    }, ZERO)
  }

  function extrasMacros(day: Day): Macros {
    return allExtras(day).reduce((sum, e) => addMacros(sum, e), ZERO)
  }

  // A logged entry replaces the plan for its slot; otherwise the plan counts.
  // Extra food is always on top.
  function dayMacros(day: Day): Macros {
    return SLOTS.reduce((sum, slot) => {
      const actual = day.actual[slot.key]
      return addMacros(sum, actual ?? plannedMacros(day.slots[slot.key]))
    }, extrasMacros(day))
  }

  // Only what's actually been logged — "eaten so far" today.
  function loggedMacros(day: Day): Macros {
    return SLOTS.reduce((sum, slot) => {
      const actual = day.actual[slot.key]
      return actual ? addMacros(sum, actual) : sum
    }, extrasMacros(day))
  }

  // Applies a change to the day being logged.
  function updateDay(change: (day: Day) => Day) {
    if (!todayRef) return
    const { week: todayWeek, dayIndex } = todayRef
    setWeeks((prev) =>
      prev.map((week) =>
        week.id !== todayWeek.id
          ? week
          : { ...week, days: week.days.map((day, i) => (i === dayIndex ? change(day) : day)) },
      ),
    )
  }

  function setWater(glasses: number) {
    updateDay((day) => ({ ...day, water: Math.max(0, glasses) }))
  }

  // Adds (index null), replaces or removes (entry null) one extra of a meal.
  function updateTodayExtra(slotKey: SlotKey, index: number | null, entry: ActualEntry | null) {
    updateDay((day) => {
            const list = [...slotExtras(day, slotKey)]
            if (index === null) {
              if (entry) list.push(entry)
            } else if (entry) {
              list[index] = entry
            } else {
              list.splice(index, 1)
            }
            // Rebuild from every meal's extras, so an old flat list gets converted here too.
            const bySlot = Object.fromEntries(SLOTS.map((sl) => [sl.key, slotExtras(day, sl.key)]))
            return { ...day, extras: { ...bySlot, [slotKey]: list } }
    })
  }

  function updateTodaySlot(slotKey: SlotKey, entry: ActualEntry | null) {
    updateDay((day) => {
      const actual = { ...day.actual }
      if (entry) actual[slotKey] = entry
      else delete actual[slotKey]
      return { ...day, actual }
    })
  }

  // "✓ Ate this": log the planned recipe(s) as eaten, as-is.
  function plannedEntry(ids: string[]): ActualEntry {
    const titles = ids
      .map((entry) => {
        const { id, portion } = parseSlotEntry(entry)
        const title = recipes.find((r) => r.id === id)?.title
        const label = portionLabel(portion)
        return title && label ? `${title} (${label})` : title
      })
      .filter(Boolean)
    const m = plannedMacros(ids)
    return {
      description: titles.join(', '),
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
      fromPlan: true,
    }
  }

  function logPlanned(slotKey: SlotKey) {
    if (!todayDay) return
    const entry = plannedEntry(todayDay.slots[slotKey])
    updateTodaySlot(slotKey, entry)
    showToast({
      message: `Καταγράφηκε το ${SLOTS.find((s) => s.key === slotKey)?.label.toLowerCase()}: ${entry.description}`,
      action: { label: 'Αναίρεση', onClick: () => updateTodaySlot(slotKey, null) },
      autoHideMs: 5000,
    })
  }

  function skipSlot(slotKey: SlotKey) {
    updateTodaySlot(slotKey, skippedEntry())
    showToast({
      message: `Δεν έφαγες ${SLOTS.find((s) => s.key === slotKey)?.label.toLowerCase()}`,
      action: { label: 'Αναίρεση', onClick: () => updateTodaySlot(slotKey, null) },
      autoHideMs: 5000,
    })
  }

  // History counts only what was actually logged ("✓ Ate this" / "Something
  // else") — the plan is an intention, not intake. Per week, the average is
  // over days with at least one logged meal, so unlogged days don't drag it down.
  const history = [...weeks]
    .filter((week) => week.startDate <= today)
    .reverse()
    .map((week) => {
      const tracked = week.days
        .map((day, i) => ({
          iso: toISODate(dayDate(week, i)),
          macros: loggedMacros(day),
          logged: SLOTS.some((slot) => day.actual[slot.key]) || allExtras(day).length > 0,
        }))
        .filter((d) => d.iso <= today && d.logged)
      const total = tracked.reduce((sum, d) => addMacros(sum, d.macros), ZERO)
      const n = tracked.length
      return {
        week,
        days: n,
        avg: n > 0 ? { calories: total.calories / n, protein: total.protein / n, carbs: total.carbs / n, fat: total.fat / n } : null,
      }
    })

  const tableWeek = history.find((h) => h.week.id === tableWeekId)?.week ?? history[0]?.week ?? null
  const tableAvg = history.find((h) => h.week.id === tableWeek?.id)?.avg ?? null

  // The last 7 full days (yesterday back), and how many days in a row
  // ended within ±10% of the calorie target.
  const isLogged = (day: Day) => SLOTS.some((slot) => day.actual[slot.key]) || allExtras(day).length > 0
  const pastDay = (back: number) => {
    const ref = findDay(weeks, toISODate(addDays(parseISODate(today), -back)))
    return ref ? ref.week.days[ref.dayIndex] : null
  }
  const last7 = (() => {
    const logged = Array.from({ length: 7 }, (_, i) => pastDay(i + 1)).filter((d): d is Day => !!d && isLogged(d))
    const total = logged.reduce((sum, d) => sum + loggedMacros(d).calories, 0)
    return { days: logged.length, avg: logged.length > 0 ? total / logged.length : null }
  })()
  let streak = 0
  if (targets) {
    for (let back = 1; back <= 365; back++) {
      const d = pastDay(back)
      if (!d || !isLogged(d) || Math.abs(loggedMacros(d).calories - targets.calories) > targets.calories * 0.1) break
      streak++
    }
  }

  const loggingActual = loggingSlot && todayDay ? todayDay.actual[loggingSlot] : undefined
  const loggingEntry = loggingActual && !loggingActual.skipped ? loggingActual : null

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div data-tour="page-calories" className="flex flex-col gap-5">
          <h2 className="text-26 font-title font-bold uppercase">Ιστορικό</h2>
          <p className="text-14 font-title text-neutral-500">
            Πώς πάνε οι μέρες και οι εβδομάδες σου. Ό,τι τρως σήμερα το γράφεις στο{' '}
            <button type="button" onClick={onGoToToday} className="font-bold text-black underline cursor-pointer">
              Σήμερα
            </button>
            . Οι αριθμοί είναι κατά προσέγγιση.
          </p>
        </div>

        {!profile && (
          <div className="bg-main-yellow border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-wrap items-center justify-between gap-10">
            <span className="text-14 font-title font-bold">
              Φτιάξε το προφίλ σου για να δεις τους ημερήσιους στόχους σου σε θερμίδες, πρωτεΐνη και νερό.
            </span>
            <button type="button" onClick={onOpenProfile} className="main-btn font-title font-bold px-15 py-10">
              Φτιάξε το προφίλ σου
            </button>
          </div>
        )}

        {/* ---------- At a glance ---------- */}
        {targets && (
          <section className="grid grid-cols-1 tab:grid-cols-3 gap-15">
            <div className="bg-main-yellow border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase">Μέσος όρος 7 ημερών</span>
              {last7.avg ? (
                <>
                  <span className="font-title">
                    <span className="text-32 font-bold">{Math.round(last7.avg)}</span>
                    <span className="text-14"> / {targets.calories} kcal</span>
                  </span>
                  <span className="text-12 font-title">
                    {Math.abs(last7.avg - targets.calories) <= targets.calories * 0.1
                      ? 'Πάνω στον στόχο σου 👌'
                      : last7.avg < targets.calories
                        ? `${Math.round(targets.calories - last7.avg)} kcal κάτω από τον στόχο`
                        : `${Math.round(last7.avg - targets.calories)} kcal πάνω από τον στόχο`}
                  </span>
                </>
              ) : (
                <span className="text-14 font-title">Δεν έχεις καταγράψει τίποτα τις τελευταίες 7 μέρες.</span>
              )}
            </div>
            <div className="bg-main-teal border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase">Σερί στον στόχο</span>
              <span className="font-title">
                <span className="text-32 font-bold">{streak}</span>
                <span className="text-14"> {streak === 1 ? 'μέρα' : 'μέρες'} {streak >= 3 ? '🔥' : ''}</span>
              </span>
              <span className="text-12 font-title">Μέρες στη σειρά μέσα στο ±10% των θερμίδων σου.</span>
            </div>
            <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase">Καταγραφή</span>
              <span className="font-title">
                <span className="text-32 font-bold">{last7.days}</span>
                <span className="text-14"> / 7 μέρες</span>
              </span>
              <span className="text-12 font-title text-neutral-500">Όσο πιο συχνά γράφεις, τόσο πιο σωστοί οι αριθμοί.</span>
            </div>
          </section>
        )}

        {/* ---------- History ---------- */}
        {history.length > 0 && (
          <section className="flex flex-col gap-15">
            <div className="flex flex-col gap-5">
              <h3 className="text-20 font-title font-bold uppercase">Εβδομάδες</h3>
              <p className="text-12 font-title text-neutral-500">
                Μετράνε μόνο τα γεύματα που κατέγραψες με «✓ Το έφαγα» ή «Κάτι άλλο». Ο μέσος όρος μετράει
                τις μέρες με τουλάχιστον ένα καταγεγραμμένο γεύμα. Διάλεξε μια εβδομάδα για να τη δεις μέρα με μέρα.
              </p>
            </div>
            {/* Two columns like Today: the day-by-day table on the left, the
                week picker on the right (above the table on mobile). */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-20 items-start">
              <div className="flex flex-col gap-15 lg:order-2">
                {history.map(({ week, days, avg }) => (
                  <button
                    key={week.id}
                    type="button"
                    onClick={() => setTableWeekId(week.id)}
                    className={
                      week.id === tableWeek?.id
                        ? 'bg-white border-3 border-main-blue shadow-[4px_4px_0_0_#5e81d1] p-15 flex flex-col gap-5 text-left cursor-pointer'
                        : 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-col gap-5 text-left cursor-pointer hover:bg-neutral-50'
                    }
                  >
                    <span className="flex items-baseline justify-between gap-10 w-full">
                      <span className="font-title font-bold uppercase">{week.label}</span>
                      <span className="text-12 font-title text-neutral-500">
                        {days} από 7 {days === 1 ? 'μέρα' : 'μέρες'} με καταγραφή
                      </span>
                    </span>
                    {avg ? (
                      <>
                        <span
                          className={`self-start px-5 text-16 font-title font-bold ${targets ? statusClass(avg.calories, targets.calories) : ''}`}
                        >
                          {Math.round(avg.calories)}
                          {targets && ` / ${targets.calories}`} kcal
                        </span>
                        <span className="flex flex-wrap gap-5 text-12 font-title font-bold">
                          {MACRO_COLUMNS.map(({ key, short }) => (
                            <span key={key} className={`px-5 ${targets ? statusClass(avg[key], targets[key]) : ''}`}>
                              {short} {Math.round(avg[key])}g
                            </span>
                          ))}
                        </span>
                      </>
                    ) : (
                      <span className="text-14 font-title text-neutral-400">Δεν έχεις καταγράψει τίποτα ακόμα</span>
                    )}
                  </button>
                ))}
              </div>

              {tableWeek && (
                <div className="lg:order-1 min-w-0">
                  <DayTable
                    week={tableWeek}
                    today={today}
                    targets={targets}
                    dayMacros={loggedMacros}
                    avg={tableAvg}
                    waterTargetGlasses={waterTargetMl !== null ? Math.ceil(waterTargetMl / GLASS_ML) : null}
                  />
                </div>
              )}
            </div>
          </section>
        )}
        {/* ---------- Fix a past day ---------- */}
        <section className="flex flex-col gap-15">
          <div data-tour="calories-fix" className="flex flex-col gap-5">
            <h3 className="text-20 font-title font-bold uppercase">Διόρθωσε μια μέρα</h3>
            <p className="text-12 font-title text-neutral-500">Ξέχασες να γράψεις κάτι; Διάλεξε τη μέρα και πρόσθεσέ το.</p>
          </div>
          <div className="flex flex-wrap items-center gap-10">
            <button
              type="button"
              onClick={() => setSelectedISO(toISODate(addDays(parseISODate(dayISO), -1)))}
              aria-label="Προηγούμενη μέρα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
            >
              <Chevron dir="left" />
            </button>
            <h3 className="text-20 font-title font-bold uppercase flex flex-wrap items-baseline gap-x-10 min-w-0 flex-1 pl-10 sm:flex-none sm:min-w-[220px]">
              {dayTitle}
              <span className="text-14 font-normal normal-case text-neutral-500">
                {!isToday && dayISO !== yesterday ? '' : `${weekdayName(parseISODate(dayISO))} `}
                {formatDayDate(parseISODate(dayISO))}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedISO(toISODate(addDays(parseISODate(dayISO), 1)))}
              disabled={dayISO >= yesterday}
              aria-label="Επόμενη μέρα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
            >
              <Chevron dir="right" />
            </button>
            {dayISO !== yesterday && (
              <button
                type="button"
                onClick={() => setSelectedISO(null)}
                className="text-14 font-title font-bold underline cursor-pointer"
              >
                Πίσω στο χθες
              </button>
            )}
          </div>

          {!todayDay ? (
            <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-wrap items-center justify-between gap-15">
              <span className="text-14 font-title">Δεν υπάρχει ακόμα πρόγραμμα για αυτή την {isToday ? 'εβδομάδα' : 'μέρα'}.</span>
              <button
                type="button"
                onClick={onGoToCalendar}
                className="main-btn font-title font-bold px-15 py-10 bg-main-blue text-white"
              >
                Στο πρόγραμμα
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-20 items-start">
              <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-col gap-15">
                {SLOTS.map((slot, slotIndex) => {
                  const planned = todayDay.slots[slot.key]
                  const entry = todayDay.actual[slot.key]
                  const plannedRecipes = planned
                    .map((entry) => {
                      const { id, portion } = parseSlotEntry(entry)
                      const recipe = recipes.find((r) => r.id === id)
                      return recipe ? Object.assign({}, recipe, { portion }) : null
                    })
                    .filter((r): r is Recipe & { portion: number } => !!r)
                  return (
                    <div
                      key={slot.key}
                      className={
                        slotIndex > 0
                          ? 'flex flex-col gap-10 pt-15 border-t border-neutral-200'
                          : 'flex flex-col gap-10'
                      }
                    >
                      <span
                        className={`inline-block self-start px-5 py-[2px] text-12 font-title font-bold uppercase border-2 border-black ${slot.badge}`}
                      >
                        {slot.label}
                      </span>

                      {entry?.skipped ? (
                        <div className="flex flex-wrap items-center justify-between gap-10 bg-neutral-100 border-2 border-dashed border-neutral-400 px-10 py-5">
                          <span className="text-14 font-title font-bold text-neutral-500">✕ Δεν έφαγα</span>
                          <span className="flex gap-15">
                            <button
                              type="button"
                              onClick={() => setLoggingSlot(slot.key)}
                              className="text-12 font-title font-bold underline cursor-pointer"
                            >
                              Τελικά έφαγα
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTodaySlot(slot.key, null)}
                              className="text-12 font-title font-bold underline cursor-pointer"
                            >
                              Αναίρεση
                            </button>
                          </span>
                        </div>
                      ) : entry ? (
                        <div className="flex flex-wrap items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5">
                          <span className="flex items-center gap-10 min-w-0">
                            {entry.photo ? (
                              <img src={entry.photo} alt="" className="w-20 h-20 object-cover border border-black shrink-0" />
                            ) : (
                              <span className="font-bold text-14 leading-none shrink-0">✓</span>
                            )}
                            <span className="text-14 font-title font-bold">
                              {entry.description}
                              <AmountBadge portion={entry.portion} />
                            </span>
                            <span className="text-12 font-title text-neutral-600 whitespace-nowrap">
                              {Math.round(entry.calories)} kcal
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLoggingSlot(slot.key)}
                            className="text-12 font-title font-bold underline cursor-pointer"
                          >
                            Αλλαγή
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-10">
                          {/* The planned meal in a box, same as on the Meal Plan */}
                          {plannedRecipes.length > 0 ? (
                            <span className="flex-1 min-w-[200px] flex flex-wrap items-baseline justify-between gap-x-10 bg-white border-2 border-black px-10 py-5">
                              <span className="flex flex-wrap gap-x-10">
                                {plannedRecipes.map((recipe, i) => (
                                  <span key={i} className="inline-flex flex-wrap items-center gap-5">
                                    <button
                                      type="button"
                                      onClick={() => onOpenRecipe(recipe.id)}
                                      className="text-14 font-title font-bold text-left hover:underline cursor-pointer"
                                    >
                                      {recipe.title}
                                    </button>
                                    <PortionBadge portion={recipe.portion} />
                                  </span>
                                ))}
                              </span>
                              <span className="text-12 font-title text-neutral-500 whitespace-nowrap">
                                {Math.round(plannedMacros(planned).calories)} kcal στο πρόγραμμα
                              </span>
                            </span>
                          ) : (
                            <span className="flex-1 min-w-[200px] text-14 font-title text-neutral-400">Δεν έχει προγραμματιστεί</span>
                          )}
                          <span className="flex gap-10">
                            {plannedRecipes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => logPlanned(slot.key)}
                                className="main-btn font-title font-bold px-10 py-5 text-12 bg-main-blue text-white"
                              >
                                ✓ Το έφαγα
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setLoggingSlot(slot.key)}
                              className="main-btn font-title font-bold px-10 py-5 text-12"
                            >
                              {plannedRecipes.length > 0 ? 'Κάτι άλλο' : 'Καταγραφή γεύματος'}
                            </button>
                            <button
                              type="button"
                              onClick={() => skipSlot(slot.key)}
                              className="main-btn font-title font-bold px-10 py-5 text-12 bg-neutral-100"
                            >
                              Δεν έφαγα
                            </button>
                          </span>
                        </div>
                      )}

                      {/* Extra food with this meal, on top of the main one */}
                      {slotExtras(todayDay, slot.key).map((extra, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5"
                        >
                          <span className="flex items-center gap-10 min-w-0">
                            {extra.photo ? (
                              <img src={extra.photo} alt="" className="w-20 h-20 object-cover border border-black shrink-0" />
                            ) : (
                              <span className="font-bold text-14 leading-none shrink-0">+</span>
                            )}
                            <span className="text-14 font-title font-bold">
                              {extra.description}
                              <AmountBadge portion={extra.portion} />
                            </span>
                            <span className="text-12 font-title text-neutral-600 whitespace-nowrap">
                              {Math.round(extra.calories)} kcal
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLoggingExtra({ slot: slot.key, index: i })}
                            className="text-12 font-title font-bold underline cursor-pointer"
                          >
                            Αλλαγή
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setLoggingExtra({ slot: slot.key, index: 'new' })}
                        className="self-start border-2 border-dashed border-neutral-400 hover:border-black px-10 py-5 text-12 text-neutral-600 hover:text-black font-title font-bold cursor-pointer"
                      >
                        + Πρόσθεσε έξτρα
                      </button>
                    </div>
                  )
                })}

              </div>

              <TodayProgress
                title={isToday ? 'Έχεις φάει' : 'Έφαγες'}
                eaten={loggedMacros(todayDay)}
                planned={dayMacros(todayDay)}
                targets={targets}
                waterGlasses={todayDay.water ?? 0}
                waterTargetGlasses={waterTargetMl !== null ? Math.ceil(waterTargetMl / GLASS_ML) : null}
                onWaterChange={setWater}
              />
            </div>
          )}
        </section>

      </div>

      {loggingExtra && todayDay && (
        <ActualEntryModal
          onAddRecipe={onAddRecipe}
          onAddIngredientDef={onAddIngredientDef}
          slotLabel={`έξτρα στο ${SLOTS.find((s) => s.key === loggingExtra.slot)?.label.toLowerCase() ?? ''}`}
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          initial={
            loggingExtra.index === 'new' ? null : (slotExtras(todayDay, loggingExtra.slot)[loggingExtra.index] ?? null)
          }
          onSave={(entry) => {
            updateTodayExtra(loggingExtra.slot, loggingExtra.index === 'new' ? null : loggingExtra.index, entry)
            setLoggingExtra(null)
          }}
          onDelete={() => {
            if (loggingExtra.index !== 'new') updateTodayExtra(loggingExtra.slot, loggingExtra.index, null)
            setLoggingExtra(null)
          }}
          onClose={() => setLoggingExtra(null)}
        />
      )}

      {loggingSlot && (
        <ActualEntryModal
          onAddRecipe={onAddRecipe}
          onAddIngredientDef={onAddIngredientDef}
          slotLabel={SLOTS.find((s) => s.key === loggingSlot)?.label ?? ''}
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          initial={loggingEntry}
          onSave={(entry) => {
            updateTodaySlot(loggingSlot, entry)
            setLoggingSlot(null)
          }}
          onDelete={() => {
            updateTodaySlot(loggingSlot, null)
            setLoggingSlot(null)
          }}
          onClose={() => setLoggingSlot(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

type DayTableProps = {
  week: Week
  today: string
  targets: Macros | null
  dayMacros: (day: Day) => Macros
  avg: Macros | null
  waterTargetGlasses: number | null
}

// Day-by-day logged calories and macros for one week. Each day notes how
// many of its meals were logged (a partly logged day reads low on purpose);
// days with nothing logged show a dash rather than a misleading 0.
function DayTable({ week, today, targets, dayMacros, avg, waterTargetGlasses }: DayTableProps) {
  const cell = 'px-5 sm:px-10 py-10 text-right whitespace-nowrap'

  // Water average over the days with any water logged, like the food average.
  const waterDays = week.days.filter((day) => (day.water ?? 0) > 0)
  const waterAvg =
    waterDays.length > 0 ? waterDays.reduce((sum, day) => sum + (day.water ?? 0), 0) / waterDays.length : null

  function waterCell(glasses: number | null) {
    return (
      <td className={cell}>
        {glasses === null || glasses === 0 ? (
          '—'
        ) : (
          <span className={`px-5 ${waterTargetGlasses ? statusClass(Math.min(glasses, waterTargetGlasses), waterTargetGlasses) : ''}`}>
            {Number.isInteger(glasses) ? glasses : glasses.toFixed(1)}
          </span>
        )}
      </td>
    )
  }

  function valueCell(value: number, target: number | undefined, unit: string, muted: boolean) {
    return (
      <td className={cell}>
        <span className={`px-5 ${!muted && target ? statusClass(value, target) : ''}`}>
          {Math.round(value)}
          {unit}
        </span>
      </td>
    )
  }

  return (
    <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000]">
      <FadeScrollX>
      <table className="w-full text-14 font-title border-collapse">
        <thead>
          <tr className="border-b-3 border-black text-12 uppercase">
            <th className="px-10 py-10 text-left">
              <span className="hidden sm:inline">{week.label}</span>
            </th>
            <th className={cell}>
              <span className="sm:hidden">kcal</span>
              <span className="hidden sm:inline">Θερμίδες</span>
              {targets && (
                <span className="block font-normal normal-case text-neutral-500">
                  <span className="hidden sm:inline">στόχος </span>
                  {targets.calories}
                </span>
              )}
            </th>
            {MACRO_COLUMNS.map(({ key, label, short }) => (
              <th key={key} className={cell}>
                {/* Phones get the one-letter names so all columns fit */}
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
                {targets && (
                  <span className="block font-normal normal-case text-neutral-500">
                    <span className="hidden sm:inline">στόχος </span>
                    {targets[key]}g
                  </span>
                )}
              </th>
            ))}
            <th className={cell}>
              💧<span className="hidden sm:inline"> Ποτήρια</span>
              {waterTargetGlasses !== null && (
                <span className="block font-normal normal-case text-neutral-500">
                  <span className="hidden sm:inline">στόχος </span>
                  {waterTargetGlasses}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {week.days.map((day, i) => {
            const date = dayDate(week, i)
            const iso = toISODate(date)
            const macros = dayMacros(day)
            const loggedCount = SLOTS.filter((slot) => day.actual[slot.key]).length
            const isFuture = iso > today
            const extrasCount = allExtras(day).length
            const mealsText =
              loggedCount === SLOTS.length ? 'όλα τα γεύματα' : `${loggedCount} από ${SLOTS.length} γεύματα`
            const extrasText = extrasCount > 0 ? ` + ${extrasCount} έξτρα` : ''
            const source = isFuture
              ? 'δεν ήρθε ακόμα'
              : loggedCount === 0 && extrasCount === 0
                ? 'χωρίς καταγραφή'
                : loggedCount === 0
                  ? `μόνο έξτρα (${extrasCount})`
                  : mealsText + extrasText
            const muted = loggedCount === 0 && extrasCount === 0
            return (
              <tr
                key={day.label}
                className={
                  iso === today
                    ? 'border-b border-neutral-200 bg-main-blue/10'
                    : muted
                      ? 'border-b border-neutral-200 text-neutral-400'
                      : 'border-b border-neutral-200'
                }
              >
                <td className="pl-10 pr-5 sm:px-10 py-10">
                  <span className="font-bold whitespace-nowrap">
                    {day.label.slice(0, 3)} {formatDayDate(date)}
                  </span>
                  <span className="hidden sm:block text-12 text-neutral-500">{iso === today ? `σήμερα · ${source}` : source}</span>
                </td>
                {muted ? (
                  <>
                    <td className={cell}>—</td>
                    {MACRO_COLUMNS.map(({ key }) => (
                      <td key={key} className={cell}>
                        —
                      </td>
                    ))}
                  </>
                ) : (
                  <>
                    {valueCell(macros.calories, targets?.calories, '', false)}
                    {MACRO_COLUMNS.map(({ key }) => (
                      <Fragment key={key}>{valueCell(macros[key], targets?.[key], 'g', false)}</Fragment>
                    ))}
                  </>
                )}
                {waterCell(isFuture ? null : (day.water ?? 0))}
              </tr>
            )
          })}
        </tbody>
        {avg && (
          <tfoot>
            <tr className="border-t-3 border-black font-bold">
              <td className="px-10 py-10">Μέσος όρος</td>
              {valueCell(avg.calories, targets?.calories, '', false)}
              {MACRO_COLUMNS.map(({ key }) => (
                <Fragment key={key}>{valueCell(avg[key], targets?.[key], 'g', false)}</Fragment>
              ))}
              {waterCell(waterAvg)}
            </tr>
          </tfoot>
        )}
      </table>
      </FadeScrollX>
    </div>
  )
}

type TodayProgressProps = {
  title: string
  eaten: Macros
  planned: Macros
  targets: Macros | null
  waterGlasses: number
  waterTargetGlasses: number | null
  onWaterChange: (glasses: number) => void
}

function ProgressRow({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const over = value > target * 1.1
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-10 text-12 font-title">
        <span className="font-bold uppercase">{label}</span>
        <span className={over ? 'font-bold text-main-red' : 'text-neutral-600'}>
          {Math.round(value)} / {target} {unit}
        </span>
      </div>
      <div className="w-full h-10 border-2 border-black bg-neutral-100">
        <div className={over ? 'h-full bg-main-red' : 'h-full bg-main-blue'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Eaten-so-far against the day's targets, plus what the full plan adds up to.
function TodayProgress({
  title,
  eaten,
  planned,
  targets,
  waterGlasses,
  waterTargetGlasses,
  onWaterChange,
}: TodayProgressProps) {
  // One glass icon per glass of the target (or per glass drunk, if more).
  const glassCount = Math.max(waterTargetGlasses ?? 8, waterGlasses)
  return (
    <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-col gap-15">
      <span className="text-14 font-title font-bold uppercase">{title}</span>
      {targets ? (
        <>
          <ProgressRow label="Θερμίδες" value={eaten.calories} target={targets.calories} unit="kcal" />
          <ProgressRow label="Πρωτεΐνη" value={eaten.protein} target={targets.protein} unit="g" />
          <ProgressRow label="Υδατάνθρακες" value={eaten.carbs} target={targets.carbs} unit="g" />
          <ProgressRow label="Λιπαρά" value={eaten.fat} target={targets.fat} unit="g" />
        </>
      ) : (
        <span className="text-14 font-title">
          {Math.round(eaten.calories)} kcal · Π {Math.round(eaten.protein)}g · Υ {Math.round(eaten.carbs)}g · Λ{' '}
          {Math.round(eaten.fat)}g
        </span>
      )}
      <div className="flex flex-col gap-5 pt-10 border-t border-neutral-200 text-12 font-title text-neutral-600">
        <span>
          Όλη η μέρα όπως σχεδιάστηκε: <span className="font-bold text-black">{Math.round(planned.calories)} kcal</span>
        </span>
      </div>
      <div className="flex flex-col gap-10 pt-10 border-t border-neutral-200">
        <div className="flex items-baseline justify-between gap-10 text-12 font-title">
          <span className="font-bold uppercase">💧 Νερό</span>
          <span className="text-neutral-600">
            {waterGlasses}
            {waterTargetGlasses !== null && ` / ${waterTargetGlasses}`}{' '}
            {waterTargetGlasses === null && waterGlasses === 1 ? 'ποτήρι' : 'ποτήρια'} ·{' '}
            {((waterGlasses * GLASS_ML) / 1000).toFixed(2).replace(/0$/, '')} L
          </span>
        </div>
        {/* Tap a glass to fill up to it; tap the last full one to empty it */}
        <div className="flex flex-wrap gap-5">
          {Array.from({ length: glassCount }, (_, i) => {
            const full = i < waterGlasses
            return (
              <button
                key={i}
                type="button"
                onClick={() => onWaterChange(full && i === waterGlasses - 1 ? i : i + 1)}
                aria-label={`${i + 1} ${i === 0 ? 'ποτήρι' : 'ποτήρια'}`}
                className={
                  full
                    ? 'w-25 h-30 border-2 border-black bg-main-blue cursor-pointer'
                    : 'w-25 h-30 border-2 border-neutral-300 bg-white hover:border-black cursor-pointer'
                }
              />
            )
          })}
        </div>
        <div className="flex gap-10">
          <button
            type="button"
            onClick={() => onWaterChange(waterGlasses + 1)}
            className="main-btn font-title font-bold px-10 py-5 text-12 bg-main-blue text-white"
          >
            + Ποτήρι
          </button>
          <button
            type="button"
            onClick={() => onWaterChange(waterGlasses - 1)}
            disabled={waterGlasses === 0}
            className="main-btn font-title font-bold px-10 py-5 text-12 disabled:opacity-30 disabled:pointer-events-none"
          >
            − Ποτήρι
          </button>
        </div>
      </div>
    </div>
  )
}

export default Calories
