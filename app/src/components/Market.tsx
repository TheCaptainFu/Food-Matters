import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroceryCategory, IngredientDef, Recipe, Week } from '../types'
import { GROCERY_CATEGORIES } from '../types'
import { addDays, makeWeek, mondayOf, parseISODate, toISODate, todayISO, weekLabel } from '../weekUtils'
import { loadShopping, saveShopping, type WeekShopping } from '../shopping'
import Toast, { type ToastData } from './Toast'

type MarketProps = {
  recipes: Recipe[]
  weeks: Week[]
  ingredientCatalog: IngredientDef[]
  // Shared with Meal Plan, so both pages always show the same week.
  activeWeekStart: string
  setActiveWeekStart: (startDate: string) => void
}

type ShoppingItem = { key: string; name: string; unit: string; amount: number; category: GroceryCategory }


const UNIT_SHORT: Record<string, string> = { g: 'g', package: 'pkg', tsp: 'tsp', tbsp: 'tbsp' }

function formatAmount(amount: number, unit: string): string {
  const rounded = Math.round(amount * 10) / 10
  const short = UNIT_SHORT[unit] ?? unit
  return short === 'g' ? `${rounded}g` : `${rounded} ${short}`
}

// Adds up every recipe's ingredients for the week's days from fromDayIndex
// on (0 = the whole week), merging the same ingredient + unit.
function computeShoppingList(
  week: Week,
  recipes: Recipe[],
  ingredientCatalog: IngredientDef[],
  fromDayIndex: number,
): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>()
  const catalogByName = new Map(ingredientCatalog.map((c) => [c.name.toLowerCase(), c]))

  week.days.slice(fromDayIndex).forEach((day) => {
    Object.values(day.slots).forEach((recipeIds) => {
      recipeIds.forEach((recipeId) => {
        const recipe = recipes.find((r) => r.id === recipeId)
        if (!recipe) return

        recipe.ingredients.forEach((ing) => {
          const key = `${ing.name.trim().toLowerCase()}|${ing.unit}`
          const existing = totals.get(key)
          if (existing) {
            existing.amount += ing.amount
          } else {
            const category = catalogByName.get(ing.name.trim().toLowerCase())?.category ?? 'other'
            totals.set(key, { key, name: ing.name, unit: ing.unit, amount: ing.amount, category })
          }
        })
      })
    })
  })

  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name))
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

function Market({ recipes, weeks, ingredientCatalog, activeWeekStart, setActiveWeekStart }: MarketProps) {
  const [shopping, setShopping] = useState<Record<string, WeekShopping>>(loadShopping)
  useEffect(() => {
    saveShopping(shopping)
  }, [shopping])

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
    weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : null

  // "From today" only means something for the current week.
  const todayIndex = Math.round((parseISODate(today).getTime() - parseISODate(activeWeekStart).getTime()) / 86_400_000)
  const fromDayIndex = isThisWeek && fromToday ? todayIndex : 0

  const items = computeShoppingList(week, recipes, ingredientCatalog, fromDayIndex)
  const state: WeekShopping = shopping[activeWeekStart] ?? { checked: [], extras: [] }
  const checkedSet = new Set(state.checked)

  const toBuy = items.filter((item) => !checkedSet.has(item.key))
  const extrasToBuy = state.extras.filter((e) => !checkedSet.has(e.id))
  const inCart = [
    ...items.filter((item) => checkedSet.has(item.key)).map((item) => ({ key: item.key, name: item.name, detail: formatAmount(item.amount, item.unit) })),
    ...state.extras.filter((e) => checkedSet.has(e.id)).map((e) => ({ key: e.id, name: e.name, detail: 'Added by you' })),
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
    const lines = [`Shopping list · ${weekLabel(activeWeekStart)}`]
    groupByCategory(toBuy).forEach((group) => {
      lines.push('', group.label)
      group.items.forEach((item) => lines.push(`- ${item.name} (${formatAmount(item.amount, item.unit)})`))
    })
    if (extrasToBuy.length > 0) {
      lines.push('', 'Other')
      extrasToBuy.forEach((e) => lines.push(`- ${e.name}`))
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message: 'Shopping list copied.', autoHideMs: 3000 }))
    } catch {
      setToast((prev) => ({
        id: (prev?.id ?? 0) + 1,
        tone: 'error',
        message: "Couldn't copy. Your browser blocked access to the clipboard.",
      }))
    }
  }

  const itemButtonClass = 'main-btn flex items-center gap-15 p-15 text-left w-full'

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-25">
        <div className="flex flex-col gap-5">
          <h2 className="text-26 font-title font-bold uppercase">Shopping List</h2>
          <p className="text-14 font-title text-neutral-500">
            Everything your Meal Plan needs, grouped by aisle. Tick things off as they go in the cart.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-15">
          <div className="flex items-center gap-10">
            <button
              type="button"
              onClick={() => setActiveWeekStart(toISODate(addDays(parseISODate(activeWeekStart), -7)))}
              aria-label="Previous week"
              className="main-btn font-title font-bold text-20 w-40 h-40 flex items-center justify-center"
            >
              ‹
            </button>
            <div className="flex flex-col items-center min-w-[140px]">
              <span className="font-title font-bold text-20 leading-tight">{weekLabel(activeWeekStart)}</span>
              {weekHint && <span className="text-14 font-title text-neutral-500 leading-tight">{weekHint}</span>}
            </div>
            <button
              type="button"
              onClick={() => setActiveWeekStart(toISODate(addDays(parseISODate(activeWeekStart), 7)))}
              aria-label="Next week"
              className="main-btn font-title font-bold text-20 w-40 h-40 flex items-center justify-center"
            >
              ›
            </button>
            {!isThisWeek && (
              <button
                type="button"
                onClick={() => setActiveWeekStart(thisWeekStart)}
                className="text-14 font-title font-bold underline cursor-pointer ml-5"
              >
                Back to this week
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-10">
            {isThisWeek && todayIndex > 0 && (
              <div className="flex gap-10">
                <button
                  type="button"
                  onClick={() => setFromToday(true)}
                  className={
                    fromToday
                      ? 'main-btn font-title font-bold px-15 py-10 bg-black text-white'
                      : 'main-btn font-title font-bold px-15 py-10'
                  }
                >
                  From today
                </button>
                <button
                  type="button"
                  onClick={() => setFromToday(false)}
                  className={
                    !fromToday
                      ? 'main-btn font-title font-bold px-15 py-10 bg-black text-white'
                      : 'main-btn font-title font-bold px-15 py-10'
                  }
                >
                  Whole week
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={copyList}
              disabled={toBuy.length + extrasToBuy.length === 0}
              className="main-btn font-title font-bold px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
            >
              📋 Copy list
            </button>
          </div>
        </div>

        {/* Always shown, so "+ Add extra" is reachable even on an empty list. */}
        <div className="flex flex-wrap items-center gap-15">
            <div className="flex-1 min-w-[200px] flex flex-col gap-5">
              {total > 0 && (
                <>
                  <span className="text-14 font-title font-bold">
                    {doneCount} of {total} in the cart
                  </span>
                  <div className="w-full h-10 border-2 border-black bg-neutral-100">
                    <div className="h-full bg-main-blue" style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="main-btn font-title font-bold px-15 py-10 shrink-0"
            >
              + Add extra
            </button>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              disabled={inCart.length === 0}
              className="main-btn font-title font-bold px-15 py-10 shrink-0 disabled:opacity-30 disabled:pointer-events-none"
            >
              🛒 In the cart ({inCart.length})
            </button>
        </div>

        {items.length === 0 && state.extras.length === 0 && (
          <p className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-20 text-14 font-title">
            {isThisWeek && fromToday && todayIndex > 0
              ? 'Nothing planned from today to the end of the week.'
              : 'No meals planned for this week yet. Plan some in Meal Plan and they’ll show up here.'}
          </p>
        )}

        {/* Added by hand — listed first, like any other group */}
        {extrasToBuy.length > 0 && (
          <section className="flex flex-col gap-10 pt-10">
            <h3 className="text-16 font-title font-bold uppercase">Added by you</h3>
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
                    aria-label={`Remove ${extra.name}`}
                    title="Remove from the list"
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
                  <span className="flex flex-col">
                    <span className="text-16 font-title font-bold">{item.name}</span>
                    <span className="text-14 font-title text-neutral-500">{formatAmount(item.amount, item.unit)}</span>
                  </span>
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
              className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[400px]"
            >
              <div className="flex flex-col gap-5">
                <h2 className="text-20 font-title font-bold uppercase">Add to the list</h2>
                <span className="text-14 font-title text-neutral-500">Anything that isn't in a recipe.</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Milk, kitchen paper…"
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
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={!newExtra.trim()}
                  className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Add
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
              className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[440px] max-h-[85vh]"
            >
              <div className="flex flex-col gap-5">
                <h2 className="text-20 font-title font-bold uppercase">In the cart ({inCart.length})</h2>
                <span className="text-14 font-title text-neutral-500">Tap something to put it back on the list.</span>
              </div>
              <div className="flex flex-col gap-10 overflow-y-auto">
                {inCart.length === 0 && (
                  <p className="text-14 font-title text-neutral-500">Nothing in the cart.</p>
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
                  Close
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
