import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroceryCategory, IngredientDef, Recipe, Week } from '../types'
import { GROCERY_CATEGORIES } from '../types'
import { addDays, makeWeek, mondayOf, parseISODate, parseSlotEntry, toISODate, todayISO, weekLabel } from '../weekUtils'
import { loadHousehold, loadShopping, saveShopping, type WeekShopping } from '../shopping'
import { formatShoppingAmount, toGrams } from '../quantities'
import Toast, { type ToastData } from './Toast'

type MarketProps = {
  recipes: Recipe[]
  weeks: Week[]
  ingredientCatalog: IngredientDef[]
  // Shared with Meal Plan, so both pages always show the same week.
  activeWeekStart: string
  setActiveWeekStart: (startDate: string) => void
  onGoToFridge: () => void
}

type ShoppingItem = {
  key: string
  name: string
  grams: number
  category: GroceryCategory
  def?: IngredientDef
}

function itemAmount(item: ShoppingItem): string {
  return formatShoppingAmount(item.grams, item.def)
}

// Adds up every recipe's ingredients for the week's days from fromDayIndex
// on (0 = the whole week). Everything is summed in grams per ingredient —
// so "1 κρεμμύδι" in one recipe and "50g κρεμμύδι" in another make one
// line — scaled from the recipe's portions to the number of people.
function computeShoppingList(
  week: Week,
  recipes: Recipe[],
  ingredientCatalog: IngredientDef[],
  fromDayIndex: number,
  people: number,
): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>()
  const catalogByName = new Map(ingredientCatalog.map((c) => [c.name.toLowerCase(), c]))

  week.days.slice(fromDayIndex).forEach((day) => {
    Object.values(day.slots).forEach((recipeIds) => {
      recipeIds.forEach((entry) => {
        const { id, portion } = parseSlotEntry(entry)
        const recipe = recipes.find((r) => r.id === id)
        if (!recipe) return

        // Your portion may be bigger (1½, 2); everyone else eats one.
        const factor = (portion + people - 1) / (recipe.servings && recipe.servings > 0 ? recipe.servings : 1)
        recipe.ingredients.forEach((ing) => {
          const key = ing.name.trim().toLowerCase()
          const def = catalogByName.get(key)
          const grams = toGrams(ing.amount, ing.unit, def) * factor
          const existing = totals.get(key)
          if (existing) {
            existing.grams += grams
          } else {
            totals.set(key, { key, name: ing.name, grams, category: def?.category ?? 'other', def })
          }
        })
      })
    })
  })

  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, 'el'))
}

// Groups items in the catalog's aisle order, so the list reads like an
// actual shopping list instead of one A-Z dump.
function groupByCategory(items: ShoppingItem[]): { category: GroceryCategory; label: string; items: ShoppingItem[] }[] {
  return GROCERY_CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    items: items.filter((item) => item.category === c.value),
  })).filter((group) => group.items.length > 0)
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        checked
          ? 'shrink-0 w-25 h-25 border-2 border-black bg-main-blue flex items-center justify-center text-white font-bold'
          : 'shrink-0 w-25 h-25 border-2 border-black bg-white'
      }
    >
      {checked ? '✓' : ''}
    </span>
  )
}

function Market({ recipes, weeks, ingredientCatalog, activeWeekStart, setActiveWeekStart, onGoToFridge }: MarketProps) {
  const [shopping, setShopping] = useState<Record<string, WeekShopping>>(loadShopping)
  useEffect(() => {
    saveShopping(shopping)
  }, [shopping])

  // Set by "Φτιάξε την εβδομάδα" (just me / how many of us).
  const [people] = useState(loadHousehold)

  const [fromToday, setFromToday] = useState(true)
  const [newExtra, setNewExtra] = useState('')
  // Ticked-off items live behind a button rather than at the bottom of a
  // long list, where nobody would find them.
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const week = weeks.find((w) => w.startDate === activeWeekStart) ?? makeWeek(activeWeekStart)
  const today = todayISO()
  const thisWeekStart = toISODate(mondayOf(new Date()))
  const isThisWeek = activeWeekStart === thisWeekStart
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

  // "From today" only means something for the current week.
  const todayIndex = Math.round((parseISODate(today).getTime() - parseISODate(activeWeekStart).getTime()) / 86_400_000)
  const fromDayIndex = isThisWeek && fromToday ? todayIndex : 0

  const items = computeShoppingList(week, recipes, ingredientCatalog, fromDayIndex, people)
  const state: WeekShopping = shopping[activeWeekStart] ?? { checked: [], extras: [] }
  const checkedSet = new Set(state.checked)

  const toBuy = items.filter((item) => !checkedSet.has(item.key))
  const extrasToBuy = state.extras.filter((e) => !checkedSet.has(e.id))
  const inCart = [
    ...items.filter((item) => checkedSet.has(item.key)).map((item) => ({ key: item.key, name: item.name, detail: itemAmount(item) })),
    ...state.extras.filter((e) => checkedSet.has(e.id)).map((e) => ({ key: e.id, name: e.name, detail: 'Πρόσθεσες εσύ' })),
  ]
  const total = items.length + state.extras.length
  const doneCount = inCart.length

  function updateWeek(update: (s: WeekShopping) => WeekShopping) {
    setShopping((prev) => ({
      ...prev,
      [activeWeekStart]: update(prev[activeWeekStart] ?? { checked: [], extras: [] }),
    }))
  }

  function toggle(key: string) {
    updateWeek((s) => ({
      ...s,
      checked: s.checked.includes(key) ? s.checked.filter((k) => k !== key) : [...s.checked, key],
    }))
  }

  function addExtra() {
    const name = newExtra.trim()
    if (!name) return
    updateWeek((s) => ({ ...s, extras: [...s.extras, { id: `extra-${crypto.randomUUID()}`, name }] }))
    setNewExtra('')
    setIsAddOpen(false)
  }

  function removeExtra(id: string) {
    updateWeek((s) => ({
      checked: s.checked.filter((k) => k !== id),
      extras: s.extras.filter((e) => e.id !== id),
    }))
  }

  // Plain-text list of what's still to buy, for pasting into a chat.
  async function copyList() {
    const lines = [`Λίστα αγορών · ${weekLabel(activeWeekStart)}`]
    groupByCategory(toBuy).forEach((group) => {
      lines.push('', group.label)
      group.items.forEach((item) => lines.push(`- ${item.name} (${itemAmount(item)})`))
    })
    if (extrasToBuy.length > 0) {
      lines.push('', 'Άλλα')
      extrasToBuy.forEach((e) => lines.push(`- ${e.name}`))
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message: 'Η λίστα αντιγράφηκε.', autoHideMs: 3000 }))
    } catch {
      setToast((prev) => ({
        id: (prev?.id ?? 0) + 1,
        tone: 'error',
        message: 'Δεν έγινε αντιγραφή. Ο browser μπλόκαρε την πρόσβαση στο πρόχειρο.',
      }))
    }
  }

  const itemButtonClass = 'main-btn flex items-center gap-15 px-15 py-10 text-left w-full'

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-25">
        <div data-tour="page-market" className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-10">
            <h2 className="text-26 font-title font-bold uppercase">Λίστα αγορών</h2>
            {/* The fridge has no tab on phones: it's reached from here and from Today. */}
            <button type="button" data-tour="market-fridge" onClick={onGoToFridge} className="main-btn shrink-0 font-title font-bold text-14 px-10 py-5">
              🧊 Ψυγείο
            </button>
          </div>
          <p className="text-14 font-title text-neutral-500">
            Ό,τι χρειάζεται το πρόγραμμά σου, ανά διάδρομο. Τσέκαρε ό,τι μπαίνει στο καλάθι.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-15">
          <div className="flex flex-wrap items-center gap-10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveWeekStart(toISODate(addDays(parseISODate(activeWeekStart), -7)))}
              aria-label="Προηγούμενη εβδομάδα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
            >
              ‹
            </button>
            <h3 className="text-20 font-title font-bold uppercase flex flex-wrap items-baseline gap-x-10 min-w-0 flex-1 pl-10 sm:flex-none sm:min-w-[220px]">
              {weekHint}
              <span className="text-14 font-normal normal-case text-neutral-500">{weekLabel(activeWeekStart)}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveWeekStart(toISODate(addDays(parseISODate(activeWeekStart), 7)))}
              aria-label="Επόμενη εβδομάδα"
              className="main-btn font-title font-bold w-40 h-40 flex items-center justify-center"
            >
              ›
            </button>
            {!isThisWeek && (
              <button
                type="button"
                onClick={() => setActiveWeekStart(thisWeekStart)}
                className="text-14 font-title font-bold underline cursor-pointer ml-5"
              >
                Πίσω σε αυτή την εβδομάδα
              </button>
            )}
          </div>

        </div>

        {/* Everything about this week's list in one box: who it's for, which
            days, progress, and the actions — instead of a row of loose buttons. */}
        <div data-tour="market-controls" className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-15 sm:p-20 flex flex-col gap-15">
          <div className="flex flex-wrap items-center justify-between gap-10">
            {/* Recipes are per portion; the list is scaled for the household
                (asked in "Φτιάξε την εβδομάδα"). Nothing to say when it's just you. */}
            {people > 1 && <span className="text-14 font-title font-bold">👨‍👩‍👧 Για {people} άτομα</span>}
            {isThisWeek && todayIndex > 0 && (
              <span className="flex border-2 border-black text-14 font-title font-bold">
                <button
                  type="button"
                  onClick={() => setFromToday(true)}
                  className={fromToday ? 'px-10 h-30 bg-black text-white cursor-pointer' : 'px-10 h-30 cursor-pointer hover:bg-neutral-100'}
                >
                  Από σήμερα
                </button>
                <button
                  type="button"
                  onClick={() => setFromToday(false)}
                  className={!fromToday ? 'px-10 h-30 bg-black text-white cursor-pointer' : 'px-10 h-30 cursor-pointer hover:bg-neutral-100'}
                >
                  Όλη η εβδομάδα
                </button>
              </span>
            )}
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-5 pt-15 border-t border-neutral-200">
              <span className="text-14 font-title font-bold">
                {doneCount} από {total} στο καλάθι
              </span>
              <div className="w-full h-10 border-2 border-black bg-neutral-100">
                <div className="h-full bg-main-blue" style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Always shown, so adding an extra works even on an empty list. */}
          <div className="flex flex-wrap gap-10">
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="main-btn font-title font-bold text-14 px-10 py-5"
            >
              + Έξτρα
            </button>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              disabled={inCart.length === 0}
              className="main-btn font-title font-bold text-14 px-10 py-5 disabled:opacity-30 disabled:pointer-events-none"
            >
              🛒 Στο καλάθι ({inCart.length})
            </button>
            <button
              type="button"
              onClick={copyList}
              disabled={toBuy.length + extrasToBuy.length === 0}
              aria-label="Αντιγραφή λίστας"
              title="Αντιγραφή λίστας"
              className="main-btn font-title font-bold text-14 px-10 py-5 ml-auto disabled:opacity-30 disabled:pointer-events-none"
            >
              📋<span className="hidden sm:inline"> Αντιγραφή</span>
            </button>
          </div>
        </div>

        {items.length === 0 && state.extras.length === 0 && (
          <p className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 text-14 font-title">
            {isThisWeek && fromToday && todayIndex > 0
              ? 'Δεν έχει προγραμματιστεί τίποτα από σήμερα ως το τέλος της εβδομάδας.'
              : 'Δεν υπάρχουν γεύματα γι’ αυτή την εβδομάδα. Πρόσθεσε μερικά στο Πρόγραμμα και θα εμφανιστούν εδώ.'}
          </p>
        )}

        {/* Added by hand — listed first, like any other group */}
        {extrasToBuy.length > 0 && (
          <section className="flex flex-col gap-10 pt-10">
            <h3 className="text-16 font-title font-bold uppercase">Πρόσθεσες εσύ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {extrasToBuy.map((extra) => (
                <div key={extra.id} className="relative">
                  <button type="button" onClick={() => toggle(extra.id)} className={`${itemButtonClass} pr-40`}>
                    <CheckBox checked={false} />
                    <span className="text-16 font-title font-bold">{extra.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExtra(extra.id)}
                    aria-label={`Αφαίρεση: ${extra.name}`}
                    title="Αφαίρεση από τη λίστα"
                    className="absolute top-1/2 -translate-y-1/2 right-15 font-bold text-14 hover:text-main-red cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* To buy, by aisle */}
        {groupByCategory(toBuy).map((group) => (
          <section key={group.category} className="flex flex-col gap-10 pt-10">
            <h3 className="text-16 font-title font-bold uppercase">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {group.items.map((item) => (
                <button key={item.key} type="button" onClick={() => toggle(item.key)} className={itemButtonClass}>
                  <CheckBox checked={false} />
                  <span className="flex-1 min-w-0 text-16 font-title font-bold">{item.name}</span>
                  <span className="shrink-0 text-14 font-title text-neutral-500">{itemAmount(item)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}


      </div>

      {isAddOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
            onClick={() => setIsAddOpen(false)}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                addExtra()
              }}
              className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[400px]"
            >
              <div className="flex flex-col gap-5">
                <h2 className="text-20 font-title font-bold uppercase">Προσθήκη στη λίστα</h2>
                <span className="text-14 font-title text-neutral-500">Ό,τι δεν υπάρχει σε κάποια συνταγή.</span>
              </div>
              <input
                type="text"
                placeholder="π.χ. Γάλα, χαρτί κουζίνας…"
                value={newExtra}
                onChange={(e) => setNewExtra(e.target.value)}
                className="border-3 border-black px-15 py-10 font-title"
                autoFocus
              />
              <div className="flex gap-10 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="main-btn font-title font-bold px-15 py-10 mr-auto"
                >
                  ← Πίσω
                </button>
                <button
                  type="submit"
                  disabled={!newExtra.trim()}
                  className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Προσθήκη
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {isCartOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
            onClick={() => setIsCartOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[440px] max-h-[85vh]"
            >
              <div className="flex flex-col gap-5">
                <h2 className="text-20 font-title font-bold uppercase">Στο καλάθι ({inCart.length})</h2>
                <span className="text-14 font-title text-neutral-500">Πάτα κάτι για να το ξαναβάλεις στη λίστα.</span>
              </div>
              <div className="flex flex-col gap-10 overflow-y-auto">
                {inCart.length === 0 && (
                  <p className="text-14 font-title text-neutral-500">Το καλάθι είναι άδειο.</p>
                )}
                {inCart.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggle(item.key)}
                    className="flex items-center gap-15 p-10 text-left w-full border-2 border-black bg-neutral-50 hover:bg-main-yellow/40 cursor-pointer"
                  >
                    <CheckBox checked />
                    <span className="flex flex-col">
                      <span className="text-16 font-title font-bold line-through">{item.name}</span>
                      <span className="text-14 font-title text-neutral-500">{item.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="main-btn font-title font-bold px-15 py-10"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

export default Market
