import { useState } from 'react'
import type { GroceryCategory, IngredientDef, Recipe, Week } from '../types'
import { GROCERY_CATEGORIES, UNITS } from '../types'

type MarketProps = {
  recipes: Recipe[]
  weeks: Week[]
  ingredientCatalog: IngredientDef[]
}

type ShoppingItem = { key: string; name: string; unit: string; amount: number; category: GroceryCategory }

function computeShoppingList(week: Week, recipes: Recipe[], ingredientCatalog: IngredientDef[]): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>()
  const catalogByName = new Map(ingredientCatalog.map((c) => [c.name.toLowerCase(), c]))

  week.days.forEach((day) => {
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

// Groups the flat item list into the same aisle order the ingredient
// catalog is organized by, so the list reads like an actual shopping list
// ("Vegetables: ...", "Fruits: ...") instead of one A-Z dump.
function groupByCategory(items: ShoppingItem[]): { category: GroceryCategory; label: string; items: ShoppingItem[] }[] {
  return GROCERY_CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    items: items.filter((item) => item.category === c.value),
  })).filter((group) => group.items.length > 0)
}

function unitLabel(unit: string) {
  return UNITS.find((u) => u.value === unit)?.label ?? unit
}

function Market({ recipes, weeks, ingredientCatalog }: MarketProps) {
  const [selectedWeekId, setSelectedWeekId] = useState(weeks[0]?.id ?? '')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? weeks[0]
  const items = selectedWeek ? computeShoppingList(selectedWeek, recipes, ingredientCatalog) : []
  const groups = groupByCategory(items)
  const checkedCount = items.filter((item) => checked.has(item.key)).length

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-20">
        <div className="flex flex-wrap items-center justify-between gap-15">
          <div className="flex items-center gap-15">
            <h2 className="text-26 font-title font-bold uppercase">Shopping List</h2>
            {items.length > 0 && (
              <span className="text-14 font-title font-bold text-neutral-500">
                {checkedCount}/{items.length} done
              </span>
            )}
          </div>

          <select
            value={selectedWeekId}
            onChange={(e) => {
              setSelectedWeekId(e.target.value)
              setChecked(new Set())
            }}
            className="bg-white border-3 border-black pl-15 pr-30 py-10 text-14 font-title font-bold min-w-150"
          >
            {weeks.map((week) => (
              <option key={week.id} value={week.id}>
                {week.label}
              </option>
            ))}
          </select>
        </div>

        {items.length === 0 ? (
          <p className="main-btn p-20 text-16 font-title font-bold text-center">
            No recipes planned for this week yet.
          </p>
        ) : (
          <div className="flex flex-col gap-25">
            {groups.map((group) => (
              <div key={group.category} className="flex flex-col gap-15">
                <h3 className="text-18 font-title font-bold uppercase border-b-3 border-black pb-5">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                  {group.items.map((item) => {
                    const isChecked = checked.has(item.key)
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleItem(item.key)}
                        className={
                          isChecked
                            ? 'main-btn flex items-center gap-15 p-15 bg-neutral-100'
                            : 'main-btn flex items-center gap-15 p-15'
                        }
                      >
                        <span
                          className={
                            isChecked
                              ? 'shrink-0 w-25 h-25 border-2 border-black bg-main-blue flex items-center justify-center text-white font-bold'
                              : 'shrink-0 w-25 h-25 border-2 border-black bg-white'
                          }
                        >
                          {isChecked ? '✓' : ''}
                        </span>

                        <span className="flex flex-col items-start text-left">
                          <span
                            className={
                              isChecked
                                ? 'text-16 font-title font-bold uppercase text-neutral-400 line-through'
                                : 'text-16 font-title font-bold uppercase'
                            }
                          >
                            {item.name}
                          </span>
                          <span className="text-14 font-title text-neutral-500">
                            {item.amount} {unitLabel(item.unit)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Market
