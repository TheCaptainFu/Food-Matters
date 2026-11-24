import { useCallback, useState } from 'react'
import type { ActualEntry, Day, IngredientDef, Recipe, SlotKey, Week } from '../types'
import { SLOT_KEYS } from '../types'
import { calculateMacroTargets, calculateWaterTargetMl, recipeMacros } from '../nutrition'
import type { Macros, Profile } from '../nutrition'
import { addDays, allExtras, findDay, skippedEntry, slotExtras, formatDayDate, todayISO, toISODate, updateDayInWeeks, weekdayName } from '../weekUtils'
import { dayInfo } from '../greekCalendar'
import type { TabKey } from './Subheader'
import ActualEntryModal from './ActualEntryModal'
import Toast, { type ToastData } from './Toast'

type TodayProps = {
  recipes: Recipe[]
  weeks: Week[]
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
  onOpenProfile: () => void
  onGoTo: (tab: TabKey) => void
  onPlanWeek: () => void
}

const SLOT_BADGE: Record<SlotKey, string> = {
  breakfast: 'bg-main-yellow text-black',
  lunch: 'bg-main-orange text-black',
  afternoon: 'bg-main-teal text-black',
  dinner: 'bg-main-blue text-white',
}

const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }
const GLASS_ML = 250

function add(a: Macros, b: Macros): Macros {
  return { calories: a.calories + b.calories, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }
}

function greeting(hour: number): string {
  if (hour < 12) return 'Καλημέρα'
  if (hour < 18) return 'Καλό απόγευμα'
  return 'Καλησπέρα'
}

// The home page: everything about today on one screen — how you're doing,
// what's on the plate next, water, and what's left to buy — with each
// part linking to the page that has the details.
function Today({
  recipes,
  weeks,
  setWeeks,
  ingredientCatalog,
  profile,
  onOpenRecipe,
  onOpenProfile,
  onGoTo,
  onPlanWeek,
}: TodayProps) {
  const [logging, setLogging] = useState<SlotKey | null>(null)
  // An extra with a meal: a new one, or the i-th one being changed.
  const [loggingExtra, setLoggingExtra] = useState<{ slot: SlotKey; index: number | 'new' } | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const now = new Date()
  const today = todayISO()
  const ref = findDay(weeks, today)
  const day: Day | null = ref ? ref.week.days[ref.dayIndex] : null
  const info = dayInfo(now)
  const showFast = !!profile?.observesFasting && info.fasting
  const tomorrow = addDays(now, 1)
  const tomorrowInfo = dayInfo(tomorrow)
  const tomorrowRef = findDay(weeks, toISODate(tomorrow))
  const tomorrowDay = tomorrowRef ? tomorrowRef.week.days[tomorrowRef.dayIndex] : null

  const targets = profile ? calculateMacroTargets(profile) : null
  const waterTarget = profile ? Math.ceil(calculateWaterTargetMl(profile) / GLASS_ML) : 8

  const recipeById = (id: string) => recipes.find((r) => r.id === id)
  const planned = (ids: string[]) =>
    ids.reduce((sum, id) => {
      const r = recipeById(id)
      return r ? add(sum, recipeMacros(r, ingredientCatalog)) : sum
    }, ZERO)

  const eaten = day
    ? SLOT_KEYS.reduce((sum, s) => {
        const entry = day.actual[s.value]
        return entry ? add(sum, entry) : sum
      }, allExtras(day).reduce((sum, e) => add(sum, e), ZERO))
    : ZERO
  const hasAnyPlan = !!day && SLOT_KEYS.some((s) => day.slots[s.value].length > 0)
  // The next meal not yet logged, to highlight it.
  const nextSlot = day ? SLOT_KEYS.find((s) => !day.actual[s.value] && day.slots[s.value].length > 0)?.value : undefined

  function updateToday(change: (d: Day) => Day) {
    setWeeks((prev) => updateDayInWeeks(prev, today, change))
  }

  function setSlotEntry(slot: SlotKey, entry: ActualEntry | null) {
    updateToday((d) => {
      const actual = { ...d.actual }
      if (entry) actual[slot] = entry
      else delete actual[slot]
      return { ...d, actual }
    })
  }

  function ateIt(slot: SlotKey) {
    if (!day) return
    const ids = day.slots[slot]
    const m = planned(ids)
    const entry: ActualEntry = {
      description: ids.map((id) => recipeById(id)?.title).filter(Boolean).join(', '),
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
      fromPlan: true,
    }
    setSlotEntry(slot, entry)
    setToast((prev) => ({
      id: (prev?.id ?? 0) + 1,
      message: `Καταγράφηκε: ${entry.description}`,
      action: { label: 'Αναίρεση', onClick: () => setSlotEntry(slot, null) },
      autoHideMs: 5000,
    }))
  }

  // Adds (index null), replaces or removes (entry null) one extra of a meal.
  function updateExtra(slot: SlotKey, index: number | null, entry: ActualEntry | null) {
    updateToday((d) => {
      const list = [...slotExtras(d, slot)]
      if (index === null) {
        if (entry) list.push(entry)
      } else if (entry) list[index] = entry
      else list.splice(index, 1)
      const bySlot = Object.fromEntries(SLOT_KEYS.map((s) => [s.value, slotExtras(d, s.value)]))
      return { ...d, extras: { ...bySlot, [slot]: list } }
    })
  }

  function skipIt(slot: SlotKey) {
    setSlotEntry(slot, skippedEntry())
    const label = SLOT_KEYS.find((s) => s.value === slot)?.label.toLowerCase() ?? ''
    setToast((prev) => ({
      id: (prev?.id ?? 0) + 1,
      message: `Δεν έφαγες ${label}`,
      action: { label: 'Αναίρεση', onClick: () => setSlotEntry(slot, null) },
      autoHideMs: 5000,
    }))
  }

  const water = day?.water ?? 0
  const pct = (value: number, target: number) => Math.min(100, Math.round((value / Math.max(1, target)) * 100))
  const card = 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000]'

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-25">
        {/* ---------- Greeting ---------- */}
        <div className="flex flex-col gap-10">
          <h2 className="text-26 font-title font-bold uppercase">{greeting(now.getHours())}!</h2>
          <div className="flex flex-wrap items-center gap-10">
            <span className="text-16 font-title text-neutral-500">
              {weekdayName(now)} {formatDayDate(now)}
            </span>
            {info.feast && (
              <span className="px-5 py-[2px] text-12 font-title font-bold bg-main-yellow border-2 border-black">
                🎉 {info.feast}
              </span>
            )}
            {showFast && (
              <span className="px-5 py-[2px] text-12 font-title font-bold bg-white border-2 border-black">
                ✝ Νηστεία{info.fishAllowed ? ' · επιτρέπεται ψάρι' : ''}
                {info.reason && !info.feast ? ` · ${info.reason}` : ''}
              </span>
            )}
          </div>
        </div>

        {!profile && (
          <div className="bg-main-yellow border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex flex-wrap items-center justify-between gap-10">
            <span className="text-14 font-title font-bold">Πες μας λίγα για σένα για να υπολογίσουμε τους στόχους σου.</span>
            <button type="button" onClick={onOpenProfile} className="main-btn font-title font-bold px-15 py-10">
              Ξεκίνα
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-20 items-start">
          {/* ---------- Meals ---------- */}
          <section className={`${card} p-20 flex flex-col gap-15`}>
            <div className="flex items-baseline justify-between gap-10">
              <h3 className="text-18 font-title font-bold uppercase">Τα σημερινά γεύματα</h3>
              <button type="button" onClick={() => onGoTo('calendar')} className="text-14 font-title font-bold underline cursor-pointer">
                Πρόγραμμα →
              </button>
            </div>

            {!hasAnyPlan ? (
              <div className="flex flex-col gap-10 items-start border-2 border-dashed border-neutral-400 p-15">
                <span className="text-14 font-title">Δεν έχεις πρόγραμμα για σήμερα.</span>
                <div className="flex flex-wrap gap-10">
                  <button
                    type="button"
                    onClick={profile ? onPlanWeek : onOpenProfile}
                    className="main-btn font-title font-bold text-14 px-15 py-10 bg-main-blue text-white"
                  >
                    Φτιάξε την εβδομάδα
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogging('lunch')}
                    className="main-btn font-title font-bold text-14 px-15 py-10"
                  >
                    Γράψε τι έφαγες
                  </button>
                </div>
              </div>
            ) : (
              SLOT_KEYS.map((slot) => {
                const entry = day?.actual[slot.value]
                const ids = day?.slots[slot.value] ?? []
                const titles = ids.map(recipeById).filter((r): r is Recipe => !!r)
                const isNext = slot.value === nextSlot
                const extras = day ? slotExtras(day, slot.value) : []
                const addExtraButton = (
                  <button
                    type="button"
                    onClick={() => setLoggingExtra({ slot: slot.value, index: 'new' })}
                    className="main-btn font-title font-bold text-12 px-10 py-5 bg-main-yellow shrink-0"
                  >
                    + Έξτρα
                  </button>
                )
                return (
                  <div
                    key={slot.value}
                    className={
                      isNext
                        ? 'flex flex-col gap-10 border-3 border-main-blue p-10 -mx-10'
                        : 'flex flex-col gap-10 border-t border-neutral-200 pt-15 first:border-t-0 first:pt-0'
                    }
                  >
                    <div className="flex items-center gap-10">
                      <span className={`px-5 py-[2px] text-12 font-title font-bold uppercase border-2 border-black ${SLOT_BADGE[slot.value]}`}>
                        {slot.label}
                      </span>
                      {isNext && <span className="text-12 font-title font-bold text-main-blue">Επόμενο</span>}
                    </div>
                    {entry ? (
                      <div className="flex items-center gap-10">
                        <div className="flex-1 min-w-0">
                    {entry.skipped ? (
                      <div className="flex items-center justify-between gap-10 bg-neutral-100 border-2 border-dashed border-neutral-400 px-10 py-5">
                        <span className="text-14 font-title font-bold text-neutral-500">✕ Δεν έφαγα</span>
                        <button
                          type="button"
                          onClick={() => setSlotEntry(slot.value, null)}
                          className="text-12 font-title font-bold underline cursor-pointer"
                        >
                          Αναίρεση
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5">
                        <span className="text-14 font-title font-bold min-w-0">✓ {entry.description}</span>
                        <span className="flex items-center gap-10 shrink-0">
                          <span className="text-12 font-title text-neutral-600 whitespace-nowrap">{Math.round(entry.calories)} kcal</span>
                          <button
                            type="button"
                            onClick={() => setSlotEntry(slot.value, null)}
                            className="text-12 font-title font-bold underline cursor-pointer"
                          >
                            Αναίρεση
                          </button>
                        </span>
                      </div>
                    )}
                        </div>
                        {extras.length === 0 && addExtraButton}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-10">
                        {titles.length > 0 ? (
                          <span className="flex-1 min-w-[180px] flex flex-wrap gap-x-10">
                            {titles.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => onOpenRecipe(r.id)}
                                className="text-16 font-title font-bold text-left hover:underline cursor-pointer"
                              >
                                {r.title}
                              </button>
                            ))}
                          </span>
                        ) : (
                          <span className="flex-1 min-w-[180px] text-14 font-title text-neutral-400">Τίποτα προγραμματισμένο</span>
                        )}
                        <span className="flex flex-wrap gap-10">
                          {titles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => ateIt(slot.value)}
                              className="main-btn font-title font-bold text-12 px-10 py-5 bg-main-blue text-white"
                            >
                              ✓ Το έφαγα
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setLogging(slot.value)}
                            className="main-btn font-title font-bold text-12 px-10 py-5"
                          >
                            {titles.length > 0 ? 'Κάτι άλλο' : 'Γράψε'}
                          </button>
                          <button
                            type="button"
                            onClick={() => skipIt(slot.value)}
                            className="main-btn font-title font-bold text-12 px-10 py-5 bg-neutral-100"
                          >
                            Δεν έφαγα
                          </button>
                          {addExtraButton}
                        </span>
                      </div>
                    )}
                    {/* Extra food with this meal, on top of the main one */}
                    {extras.map((extra, i) => (
                      <div key={i} className="flex items-center gap-10">
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-10 bg-main-yellow/40 border-2 border-black px-10 py-5">
                        <span className="flex items-center gap-10 min-w-0">
                          <span className="text-14 font-title font-bold">+ {extra.description}</span>
                          <span className="text-12 font-title text-neutral-600 whitespace-nowrap">{Math.round(extra.calories)} kcal</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updateExtra(slot.value, i, null)}
                          className="text-12 font-title font-bold underline cursor-pointer"
                        >
                          Αφαίρεση
                        </button>
                      </div>
                      {/* After a logged meal, "+ Έξτρα" sits by the last row. */}
                      {entry && i === extras.length - 1 && addExtraButton}
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </section>

          <div className="flex flex-col gap-20">
            {/* ---------- Progress ---------- */}
            <section className={`${card} p-20 flex flex-col gap-10`}>
              <div className="flex items-baseline justify-between gap-10">
                <h3 className="text-14 font-title font-bold uppercase">Έχεις φάει</h3>
                <button type="button" onClick={() => onGoTo('calories')} className="text-12 font-title font-bold underline cursor-pointer">
                  Λεπτομέρειες →
                </button>
              </div>
              <span className="font-title">
                <span className="text-32 font-bold">{Math.round(eaten.calories)}</span>
                <span className="text-16 text-neutral-500"> {targets ? `/ ${targets.calories} kcal` : 'kcal'}</span>
              </span>
              {targets && (
                <>
                  <div className="w-full h-10 border-2 border-black bg-neutral-100">
                    <div className="h-full bg-main-blue" style={{ width: `${pct(eaten.calories, targets.calories)}%` }} />
                  </div>
                  <span className="text-12 font-title text-neutral-500">
                    {eaten.calories < targets.calories
                      ? `Σου μένουν ${Math.round(targets.calories - eaten.calories)} kcal`
                      : `${Math.round(eaten.calories - targets.calories)} kcal πάνω από τον στόχο`}
                  </span>
                  <div className="grid grid-cols-3 gap-10 pt-5">
                    {(
                      [
                        ['Πρωτεΐνη', eaten.protein, targets.protein],
                        ['Υδατ.', eaten.carbs, targets.carbs],
                        ['Λιπαρά', eaten.fat, targets.fat],
                      ] as const
                    ).map(([label, value, target]) => (
                      <div key={label} className="flex flex-col gap-5">
                        <span className="text-12 font-title font-bold uppercase">{label}</span>
                        <div className="w-full h-[6px] border border-black bg-neutral-100">
                          <div className="h-full bg-black" style={{ width: `${pct(value, target)}%` }} />
                        </div>
                        <span className="text-12 font-title text-neutral-500">
                          {Math.round(value)}/{target}g
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* ---------- Water ---------- */}
            <section className={`${card} p-20 flex items-center justify-between gap-10`}>
              <span className="flex flex-col">
                <span className="text-14 font-title font-bold uppercase">💧 Νερό</span>
                <span className="text-14 font-title text-neutral-500">
                  {water} / {waterTarget} ποτήρια
                </span>
              </span>
              <span className="flex gap-10">
                <button
                  type="button"
                  onClick={() => updateToday((d) => ({ ...d, water: Math.max(0, (d.water ?? 0) - 1) }))}
                  disabled={water === 0}
                  aria-label="Ένα ποτήρι λιγότερο"
                  className="main-btn font-title font-bold w-40 h-40 disabled:opacity-30 disabled:pointer-events-none"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => updateToday((d) => ({ ...d, water: (d.water ?? 0) + 1 }))}
                  className="main-btn font-title font-bold px-15 h-40 bg-main-blue text-white"
                >
                  + Ποτήρι
                </button>
              </span>
            </section>

            {/* ---------- Shopping & tomorrow ---------- */}
            <section className={`${card} p-20 flex flex-col gap-10`}>
              <button
                type="button"
                onClick={() => onGoTo('market')}
                className="flex items-center justify-between gap-10 text-left cursor-pointer"
              >
                <span className="text-14 font-title font-bold uppercase">🛒 Λίστα αγορών</span>
                <span className="text-14 font-title font-bold underline">Άνοιξε →</span>
              </button>
              <div className="flex flex-col gap-5 pt-10 border-t border-neutral-200">
                <span className="text-14 font-title font-bold uppercase">
                  Αύριο <span className="font-normal normal-case text-neutral-500">· {weekdayName(tomorrow)}</span>
                </span>
                {(tomorrowInfo.feast || (profile?.observesFasting && tomorrowInfo.fasting)) && (
                  <span className="text-12 font-title">
                    {tomorrowInfo.feast ? `🎉 ${tomorrowInfo.feast}` : ''}
                    {tomorrowInfo.feast && profile?.observesFasting && tomorrowInfo.fasting ? ' · ' : ''}
                    {profile?.observesFasting && tomorrowInfo.fasting ? `✝ Νηστεία${tomorrowInfo.fishAllowed ? ' (ψάρι)' : ''}` : ''}
                  </span>
                )}
                {tomorrowDay && SLOT_KEYS.some((s) => tomorrowDay.slots[s.value].length > 0) ? (
                  <ul className="flex flex-col gap-10 pt-5">
                    {SLOT_KEYS.map((s) => {
                      const names = tomorrowDay.slots[s.value].map((id) => recipeById(id)?.title).filter(Boolean)
                      return names.length > 0 ? (
                        <li key={s.value} className="flex flex-col gap-[2px]">
                          <span className="text-12 font-title font-bold uppercase text-neutral-500">{s.label}</span>
                          <span className="text-16 font-title font-bold leading-snug">{names.join(', ')}</span>
                        </li>
                      ) : null
                    })}
                  </ul>
                ) : (
                  <span className="text-14 font-title text-neutral-400">Δεν έχει προγραμματιστεί ακόμα.</span>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {logging && (
        <ActualEntryModal
          slotLabel={SLOT_KEYS.find((s) => s.value === logging)?.label ?? ''}
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          initial={null}
          onSave={(entry) => {
            setSlotEntry(logging, entry)
            setLogging(null)
          }}
          onDelete={() => setLogging(null)}
          onClose={() => setLogging(null)}
        />
      )}

      {loggingExtra && (
        <ActualEntryModal
          slotLabel={`έξτρα στο ${SLOT_KEYS.find((s) => s.value === loggingExtra.slot)?.label.toLowerCase() ?? ''}`}
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          initial={loggingExtra.index === 'new' || !day ? null : (slotExtras(day, loggingExtra.slot)[loggingExtra.index] ?? null)}
          onSave={(entry) => {
            updateExtra(loggingExtra.slot, loggingExtra.index === 'new' ? null : loggingExtra.index, entry)
            setLoggingExtra(null)
          }}
          onDelete={() => {
            if (loggingExtra.index !== 'new') updateExtra(loggingExtra.slot, loggingExtra.index, null)
            setLoggingExtra(null)
          }}
          onClose={() => setLoggingExtra(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

export default Today
