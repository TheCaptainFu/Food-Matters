import { useCallback, useEffect, useState } from 'react'
import type { Recipe, IngredientDef, GroceryCategory } from '../types'
import { CATEGORIES, GROCERY_CATEGORIES } from '../types'
import type { Profile } from '../nutrition'
import { recipeMacros } from '../nutrition'
import { filterCompatibleRecipes } from '../dietaryRestrictions'
import { loadFromStorage, saveToStorage } from '../storage'
import { addExtrasToWeek } from '../shopping'
import { mondayOf, toISODate } from '../weekUtils'
import Toast, { type ToastData } from './Toast'

type LeftoversProps = {
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onOpenRecipe: (id: string) => void
}

const FRIDGE_KEY = 'food-matters-fridge'
const BASICS_KEY = 'food-matters-fridge-basics'

// Pantry staples most kitchens always have. With "I have the basics" on,
// recipes aren't held back just because salt or olive oil wasn't ticked.
const BASIC_CATEGORIES: GroceryCategory[] = ['oils', 'herbsSpices']

function Leftovers({ recipes, ingredientCatalog, profile, onOpenRecipe }: LeftoversProps) {
  // What's in the fridge, remembered between visits.
  const [have, setHave] = useState<string[]>(() => loadFromStorage<string[]>(FRIDGE_KEY, []))
  const [hasBasics, setHasBasics] = useState(() => loadFromStorage<boolean>(BASICS_KEY, true))
  useEffect(() => saveToStorage(FRIDGE_KEY, have), [have])
  useEffect(() => saveToStorage(BASICS_KEY, hasBasics), [hasBasics])

  const [search, setSearch] = useState('')
  const [isBrowsing, setIsBrowsing] = useState(false)

  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const haveSet = new Set(have.map((n) => n.toLowerCase()))
  const categoryByName = new Map(ingredientCatalog.map((c) => [c.name.toLowerCase(), c.category]))

  function add(name: string) {
    if (haveSet.has(name.toLowerCase())) return
    setHave((prev) => [...prev, name])
    setSearch('')
  }

  function remove(name: string) {
    setHave((prev) => prev.filter((n) => n !== name))
  }

  function toggle(name: string) {
    if (haveSet.has(name.toLowerCase())) remove(name)
    else add(name)
  }

  const query = search.trim().toLowerCase()
  const suggestions = query
    ? ingredientCatalog
        .filter((c) => c.name.toLowerCase().includes(query) && !haveSet.has(c.name.toLowerCase()))
        // Names that start with what you typed come first ("egg" → Eggs before Boiled egg).
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query)))
        .slice(0, 8)
    : []

  function isCovered(name: string) {
    const key = name.toLowerCase()
    if (haveSet.has(key)) return true
    const category = categoryByName.get(key)
    return hasBasics && !!category && BASIC_CATEGORIES.includes(category)
  }

  // Same diet/exclusion rules as the Meal Plan's suggestions.
  const candidates = profile
    ? filterCompatibleRecipes(recipes, profile.diet, profile.excludedIngredients)
    : recipes

  const withMissing = candidates.map((recipe) => ({
    recipe,
    missing: recipe.ingredients.filter((ing) => !isCovered(ing.name)).map((ing) => ing.name),
  }))
  const canMake = withMissing.filter((r) => r.missing.length === 0)
  const almost = withMissing
    .filter((r) => r.missing.length > 0 && r.missing.length <= 2)
    .sort((a, b) => a.missing.length - b.missing.length)

  function addMissingToShopping(missing: string[]) {
    const weekStart = toISODate(mondayOf(new Date()))
    const added = addExtrasToWeek(weekStart, missing)
    setToast((prev) => ({
      id: (prev?.id ?? 0) + 1,
      autoHideMs: 3500,
      message:
        added === 0
          ? 'Υπάρχει ήδη στη λίστα αγορών της εβδομάδας.'
          : `${missing.length === 1 ? `Το «${missing[0]}» μπήκε` : `${added} υλικά μπήκαν`} στη λίστα αγορών της εβδομάδας.`,
    }))
  }

  function kcal(recipe: Recipe) {
    return Math.round(recipeMacros(recipe, ingredientCatalog).calories)
  }

  const cardClass = 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000]'

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div data-tour="page-leftovers" className="flex flex-col gap-5">
          <h2 className="text-26 font-title font-bold uppercase">Τι έχεις στο ψυγείο;</h2>
          <p className="text-14 font-title text-neutral-500">
            Πρόσθεσε ό,τι έχεις και θα σου δείξουμε τι μπορείς να μαγειρέψεις.
          </p>
        </div>

        {/* ---------- The fridge ---------- */}
        <section className={`${cardClass} p-20 flex flex-col gap-20`}>
          <div className="flex flex-wrap items-start gap-10">
          <div className="relative flex-1 min-w-[220px] max-w-[420px]">
            <input
              type="search"
              placeholder="Πρόσθεσε υλικό, π.χ. αυγά…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions[0]) {
                  e.preventDefault()
                  add(suggestions[0].name)
                }
              }}
              className="border-3 border-black px-15 py-10 font-title w-full"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border-3 border-t-0 border-black shadow-[4px_4px_0_0_#000] max-h-[260px] overflow-y-auto">
                {suggestions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => add(c.name)}
                    className="flex w-full items-center justify-between gap-10 text-left px-15 py-10 text-16 font-title font-bold hover:bg-main-yellow border-b border-neutral-200 last:border-b-0 cursor-pointer"
                  >
                    {c.name}
                    <span className="text-14 font-normal text-neutral-500">+ Προσθήκη</span>
                  </button>
                ))}
              </div>
            )}
            {query && suggestions.length === 0 && (
              <p className="pt-5 text-14 font-title text-neutral-500">Κανένα υλικό δεν ταιριάζει με «{search.trim()}».</p>
            )}
          </div>
            <button
              type="button"
              onClick={() => setIsBrowsing((v) => !v)}
              aria-expanded={isBrowsing}
              className={
                isBrowsing
                  ? 'main-btn font-title font-bold px-15 py-10 bg-black text-white'
                  : 'main-btn font-title font-bold px-15 py-10'
              }
            >
              {isBrowsing ? 'Απόκρυψη' : 'Όλα τα υλικά'}
            </button>
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex items-baseline gap-15">
              <span className="text-14 font-title font-bold uppercase text-neutral-500">
                Στο ψυγείο σου ({have.length})
              </span>
              {have.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHave([])}
                  className="text-14 font-title font-bold underline text-main-red cursor-pointer"
                >
                  Καθαρισμός
                </button>
              )}
            </div>
            {have.length === 0 ? (
              <span className="text-14 font-title text-neutral-400">Τίποτα ακόμα. Ψάξε παραπάνω ή δες όλα τα υλικά.</span>
            ) : (
              <div className="flex flex-wrap gap-10">
                {have.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-10 pl-10 pr-5 py-5 text-14 font-title font-bold bg-main-yellow border-2 border-black"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => remove(name)}
                      aria-label={`Αφαίρεση: ${name}`}
                      className="w-20 h-20 flex items-center justify-center leading-none hover:bg-black hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-15 border-t border-neutral-200">
            <button
              type="button"
              role="checkbox"
              aria-checked={hasBasics}
              onClick={() => setHasBasics((v) => !v)}
              className="flex items-center gap-10 text-left cursor-pointer"
            >
              <span
                aria-hidden="true"
                className={
                  hasBasics
                    ? 'w-20 h-20 shrink-0 border-2 border-black bg-main-blue text-white font-bold text-14 flex items-center justify-center'
                    : 'w-20 h-20 shrink-0 border-2 border-black bg-white'
                }
              >
                {hasBasics ? '✓' : ''}
              </span>
              <span className="text-14 font-title">
                <span className="font-bold">Έχω τα βασικά</span>
                <span className="text-neutral-500"> (λάδι, αλάτι, πιπέρι, μυρωδικά)</span>
              </span>
            </button>
          </div>

          {isBrowsing && (
            <div className="flex flex-col gap-15 max-h-[420px] overflow-y-auto pr-5">
              {GROCERY_CATEGORIES.map((g) => {
                const items = ingredientCatalog.filter((c) => c.category === g.value)
                if (items.length === 0) return null
                return (
                  <div key={g.value} className="flex flex-col gap-10">
                    <span className="text-14 font-title font-bold uppercase">{g.label}</span>
                    <div className="flex flex-wrap gap-5">
                      {items.map((c) => {
                        const isIn = haveSet.has(c.name.toLowerCase())
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => toggle(c.name)}
                            className={
                              isIn
                                ? 'px-10 py-5 text-14 font-title font-bold border-2 border-black bg-main-yellow cursor-pointer'
                                : 'px-10 py-5 text-14 font-title font-bold border-2 border-black bg-white hover:bg-neutral-50 cursor-pointer'
                            }
                          >
                            {isIn ? '✓ ' : ''}
                            {c.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ---------- Results ---------- */}
        {have.length === 0 ? (
          <p className={`${cardClass} p-20 text-16 font-title font-bold text-center`}>
            Πρόσθεσε τα υλικά που έχεις για να δεις τι μπορείς να μαγειρέψεις.
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">Μπορείς να φτιάξεις ({canMake.length})</h3>
              {canMake.length === 0 ? (
                <p className="text-14 font-title text-neutral-500">
                  Τίποτα μόνο με αυτά. Πρόσθεσε μερικά υλικά ακόμα.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                  {canMake.map(({ recipe }) => {
                    const categoryColor =
                      CATEGORIES.find((c) => c.value === recipe.category)?.color ?? 'bg-neutral-200'
                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => onOpenRecipe(recipe.id)}
                        className="main-btn flex flex-col p-0 overflow-hidden text-left"
                      >
                        <span className={`h-10 w-full ${categoryColor}`} />
                        <span className="p-15 flex items-baseline justify-between gap-10">
                          <span className="font-title font-bold uppercase">{recipe.title}</span>
                          <span className="text-14 font-title text-neutral-500 whitespace-nowrap">
                            {kcal(recipe)} kcal
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">Λείπουν λίγα ({almost.length})</h3>
              {almost.length === 0 ? (
                <p className="text-14 font-title text-neutral-500">Καμία κοντινή αντιστοιχία.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                  {almost.map(({ recipe, missing }) => (
                    <div key={recipe.id} className={`${cardClass} p-15 flex flex-col gap-10`}>
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(recipe.id)}
                        className="flex items-baseline justify-between gap-10 text-left cursor-pointer"
                      >
                        <span className="font-title font-bold uppercase hover:underline">{recipe.title}</span>
                        <span className="text-14 font-title text-neutral-500 whitespace-nowrap">
                          {kcal(recipe)} kcal
                        </span>
                      </button>
                      <span className="text-14 font-title text-neutral-500">
                        Λείπουν: <span className="font-bold text-black">{missing.join(', ')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => addMissingToShopping(missing)}
                        className="self-start text-14 font-title font-bold underline cursor-pointer"
                      >
                        🛒 Στη λίστα αγορών
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

export default Leftovers
