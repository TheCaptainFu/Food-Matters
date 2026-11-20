import { Fragment, useState } from 'react'
import type { ActualEntry, Day, IngredientDef, Recipe, SlotKey, Week } from '../types'
import { calculateMacroTargets, calculateWaterTargetMl, recipeMacros } from '../nutrition'
import type { Macros, Profile } from '../nutrition'
import { dayDate, findDay, formatDayDate, toISODate, todayISO } from '../weekUtils'
import ActualEntryModal from './ActualEntryModal'

type CaloriesProps = {
  recipes: Recipe[]
  weeks: Week[]
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
  onOpenProfile: () => void
  onGoToCalendar: () => void
}

// badge classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them in this file
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: 'Breakfast', badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: 'Lunch', badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: 'Afternoon', badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: 'Dinner', badge: 'bg-main-blue text-white' },
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
  { key: 'protein', label: 'Protein', short: 'P' },
  { key: 'carbs', label: 'Carbs', short: 'C' },
  { key: 'fat', label: 'Fat', short: 'F' },
] as const

function Calories({
  recipes,
  weeks,
  setWeeks,
  ingredientCatalog,
  profile,
  onOpenRecipe,
  onOpenProfile,
  onGoToCalendar,
}: CaloriesProps) {
  const [loggingSlot, setLoggingSlot] = useState<SlotKey | null>(null)
  // Which week the day-by-day table shows; null = the latest one in History.
  const [tableWeekId, setTableWeekId] = useState<string | null>(null)

  const targets = profile ? calculateMacroTargets(profile) : null
  const today = todayISO()
  const todayRef = findDay(weeks, today)
  const todayDay = todayRef ? todayRef.week.days[todayRef.dayIndex] : null

  function plannedMacros(recipeIds: string[]): Macros {
    return recipeIds.reduce((sum, id) => {
      const recipe = recipes.find((r) => r.id === id)
      return recipe ? addMacros(sum, recipeMacros(recipe, ingredientCatalog)) : sum
    }, ZERO)
  }

  // A logged entry replaces the plan for its slot; otherwise the plan counts.
  function dayMacros(day: Day): Macros {
    return SLOTS.reduce((sum, slot) => {
      const actual = day.actual[slot.key]
      return addMacros(sum, actual ?? plannedMacros(day.slots[slot.key]))
    }, ZERO)
  }

  // Only what's actually been logged — "eaten so far" today.
  function loggedMacros(day: Day): Macros {
    return SLOTS.reduce((sum, slot) => {
      const actual = day.actual[slot.key]
      return actual ? addMacros(sum, actual) : sum
    }, ZERO)
  }

  function updateTodaySlot(slotKey: SlotKey, entry: ActualEntry | null) {
    if (!todayRef) return
    const { week: todayWeek, dayIndex } = todayRef
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== todayWeek.id) return week
        return {
          ...week,
          days: week.days.map((day, i) => {
            if (i !== dayIndex) return day
            const actual = { ...day.actual }
            if (entry) actual[slotKey] = entry
            else delete actual[slotKey]
            return { ...day, actual }
          }),
        }
      }),
    )
  }

  // "✓ Ate this": log the planned recipe(s) as eaten, as-is.
  function logPlanned(slotKey: SlotKey) {
    if (!todayDay) return
    const ids = todayDay.slots[slotKey]
    const titles = ids.map((id) => recipes.find((r) => r.id === id)?.title).filter(Boolean)
    const m = plannedMacros(ids)
    updateTodaySlot(slotKey, {
      description: titles.join(', '),
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
      fromPlan: true,
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
          logged: SLOTS.some((slot) => day.actual[slot.key]),
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

  const loggingEntry = loggingSlot && todayDay ? (todayDay.actual[loggingSlot] ?? null) : null

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div className="flex flex-col gap-5">
          <h2 className="text-26 font-title font-bold uppercase">Calories</h2>
          <p className="text-14 font-title text-neutral-500">
            Log what you actually eat today and see how your weeks are going. Numbers are rough estimates.
          </p>
        </div>

        {!profile && (
          <div className="bg-main-yellow border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-wrap items-center justify-between gap-10">
            <span className="text-14 font-title font-bold">
              Set up your profile to get your daily calorie, protein and water targets.
            </span>
            <button type="button" onClick={onOpenProfile} className="main-btn font-title font-bold px-15 py-10">
              Set up profile
            </button>
          </div>
        )}

        {/* ---------- Today ---------- */}
        <section className="flex flex-col gap-15">
          <h3 className="text-20 font-title font-bold uppercase flex items-baseline gap-10">
            Today
            <span className="text-14 font-normal normal-case text-neutral-500">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })} {formatDayDate(new Date())}
            </span>
          </h3>

          {!todayDay ? (
            <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-wrap items-center justify-between gap-15">
              <span className="text-14 font-title">There's no plan for this week yet.</span>
              <button
                type="button"
                onClick={onGoToCalendar}
                className="main-btn font-title font-bold px-15 py-10 bg-main-blue text-white"
              >
                Go to Meal Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-20 items-start">
              <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-col gap-15">
                {SLOTS.map((slot, slotIndex) => {
                  const planned = todayDay.slots[slot.key]
                  const entry = todayDay.actual[slot.key]
                  const plannedRecipes = planned
                    .map((id) => recipes.find((r) => r.id === id))
                    .filter((r): r is Recipe => !!r)
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

                      {entry ? (
                        <div className="flex flex-wrap items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5">
                          <span className="flex items-center gap-10 min-w-0">
                            {entry.photo ? (
                              <img src={entry.photo} alt="" className="w-20 h-20 object-cover border border-black shrink-0" />
                            ) : (
                              <span className="font-bold text-14 leading-none shrink-0">✓</span>
                            )}
                            <span className="text-14 font-title font-bold">{entry.description}</span>
                            <span className="text-12 font-title text-neutral-600 whitespace-nowrap">
                              {Math.round(entry.calories)} kcal
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLoggingSlot(slot.key)}
                            className="text-12 font-title font-bold underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-10">
                          {plannedRecipes.length > 0 ? (
                            <span className="flex flex-wrap items-baseline gap-x-10 min-w-0">
                              {plannedRecipes.map((recipe, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => onOpenRecipe(recipe.id)}
                                  className="text-14 font-title font-bold text-left hover:underline cursor-pointer"
                                >
                                  {recipe.title}
                                </button>
                              ))}
                              <span className="text-12 font-title text-neutral-500 whitespace-nowrap">
                                {Math.round(plannedMacros(planned).calories)} kcal planned
                              </span>
                            </span>
                          ) : (
                            <span className="text-14 font-title text-neutral-400">Nothing planned</span>
                          )}
                          <span className="flex gap-10">
                            {plannedRecipes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => logPlanned(slot.key)}
                                className="main-btn font-title font-bold px-10 py-5 text-12 bg-main-blue text-white"
                              >
                                ✓ Ate this
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setLoggingSlot(slot.key)}
                              className="main-btn font-title font-bold px-10 py-5 text-12"
                            >
                              {plannedRecipes.length > 0 ? 'Something else' : 'Log a meal'}
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <TodayProgress
                eaten={loggedMacros(todayDay)}
                planned={dayMacros(todayDay)}
                targets={targets}
                waterMl={profile ? calculateWaterTargetMl(profile) : null}
              />
            </div>
          )}
        </section>

        {/* ---------- History ---------- */}
        {history.length > 0 && (
          <section className="flex flex-col gap-15">
            <div className="flex flex-col gap-5">
              <h3 className="text-20 font-title font-bold uppercase">History</h3>
              <p className="text-12 font-title text-neutral-500">
                Based only on meals you've logged with ✓ Ate this or Something else. The average counts days
                with at least one logged meal. Pick a week to see it day by day.
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
                        {days} of 7 days logged
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
                      <span className="text-14 font-title text-neutral-400">Nothing logged yet</span>
                    )}
                  </button>
                ))}
              </div>

              {tableWeek && (
                <div className="lg:order-1 min-w-0">
                  <DayTable week={tableWeek} today={today} targets={targets} dayMacros={loggedMacros} avg={tableAvg} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {loggingSlot && (
        <ActualEntryModal
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
    </div>
  )
}

type DayTableProps = {
  week: Week
  today: string
  targets: Macros | null
  dayMacros: (day: Day) => Macros
  avg: Macros | null
}

// Day-by-day logged calories and macros for one week. Each day notes how
// many of its meals were logged (a partly logged day reads low on purpose);
// days with nothing logged show a dash rather than a misleading 0.
function DayTable({ week, today, targets, dayMacros, avg }: DayTableProps) {
  const cell = 'px-10 py-10 text-right whitespace-nowrap'

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
    <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] overflow-x-auto">
      <table className="w-full text-14 font-title border-collapse">
        <thead>
          <tr className="border-b-3 border-black text-12 uppercase">
            <th className="px-10 py-10 text-left">{week.label}</th>
            <th className={cell}>
              Calories
              {targets && <span className="block font-normal normal-case text-neutral-500">goal {targets.calories}</span>}
            </th>
            {MACRO_COLUMNS.map(({ key, label }) => (
              <th key={key} className={cell}>
                {label}
                {targets && <span className="block font-normal normal-case text-neutral-500">goal {targets[key]}g</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.days.map((day, i) => {
            const date = dayDate(week, i)
            const iso = toISODate(date)
            const macros = dayMacros(day)
            const loggedCount = SLOTS.filter((slot) => day.actual[slot.key]).length
            const isFuture = iso > today
            const source = isFuture
              ? 'upcoming'
              : loggedCount === 0
                ? 'not logged'
                : loggedCount === SLOTS.length
                  ? 'all meals logged'
                  : `${loggedCount} of ${SLOTS.length} meals logged`
            const muted = loggedCount === 0
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
                <td className="px-10 py-10">
                  <span className="font-bold">
                    {day.label.slice(0, 3)} {formatDayDate(date)}
                  </span>
                  <span className="block text-12 text-neutral-500">{iso === today ? `today · ${source}` : source}</span>
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
              </tr>
            )
          })}
        </tbody>
        {avg && (
          <tfoot>
            <tr className="border-t-3 border-black font-bold">
              <td className="px-10 py-10">Average</td>
              {valueCell(avg.calories, targets?.calories, '', false)}
              {MACRO_COLUMNS.map(({ key }) => (
                <Fragment key={key}>{valueCell(avg[key], targets?.[key], 'g', false)}</Fragment>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

type TodayProgressProps = {
  eaten: Macros
  planned: Macros
  targets: Macros | null
  waterMl: number | null
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
function TodayProgress({ eaten, planned, targets, waterMl }: TodayProgressProps) {
  return (
    <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 flex flex-col gap-15">
      <span className="text-14 font-title font-bold uppercase">Eaten so far</span>
      {targets ? (
        <>
          <ProgressRow label="Calories" value={eaten.calories} target={targets.calories} unit="kcal" />
          <ProgressRow label="Protein" value={eaten.protein} target={targets.protein} unit="g" />
          <ProgressRow label="Carbs" value={eaten.carbs} target={targets.carbs} unit="g" />
          <ProgressRow label="Fat" value={eaten.fat} target={targets.fat} unit="g" />
        </>
      ) : (
        <span className="text-14 font-title">
          {Math.round(eaten.calories)} kcal · P {Math.round(eaten.protein)}g · C {Math.round(eaten.carbs)}g · F{' '}
          {Math.round(eaten.fat)}g
        </span>
      )}
      <div className="flex flex-col gap-5 pt-10 border-t border-neutral-200 text-12 font-title text-neutral-600">
        <span>
          Whole day as planned: <span className="font-bold text-black">{Math.round(planned.calories)} kcal</span>
        </span>
        {waterMl !== null && (
          <span>
            💧 Water target: <span className="font-bold text-black">{(waterMl / 1000).toFixed(1)} L</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default Calories
