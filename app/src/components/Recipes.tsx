import { useState } from 'react'
import AddRecipeModal from './AddRecipeModal'
import { recipeInfo, formatMinutes, formatEuro, COST_LABEL, type Season } from '../recipeTraits'
import ScrollRow from './ScrollRow'
import IngredientsManager from './IngredientsManager'
import type { Recipe, IngredientDef, SlotKey } from '../types'
import { CATEGORIES, SLOT_KEYS } from '../types'

// Same colours as each meal's badge on the Calendar. Literal class strings
// (not interpolated) so the Tailwind build picks them up.
const MEAL_ACTIVE: Record<SlotKey, string> = {
  breakfast: 'bg-main-yellow text-black',
  lunch: 'bg-main-orange text-black',
  afternoon: 'bg-main-teal text-black',
  dinner: 'bg-main-blue text-white',
}

type SortKey = 'az' | 'kcal' | 'protein' | 'cost' | 'time'

type RecipesProps = {
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  onAddIngredientDef: (def: IngredientDef) => void
  onEditIngredientDef: (oldName: string, def: IngredientDef) => void
  onDeleteIngredientDef: (name: string) => void
  onAddRecipe: (recipe: Recipe) => void
  onOpenRecipe: (id: string) => void
}

function Recipes({
  recipes,
  ingredientCatalog,
  onAddIngredientDef,
  onEditIngredientDef,
  onDeleteIngredientDef,
  onAddRecipe,
  onOpenRecipe,
}: RecipesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Recipes and the ingredients they're built from live on one page, as
  // two tabs — the ingredients tab is where ingredients get edited.
  const [view, setView] = useState<'recipes' | 'ingredients'>('recipes')
  // Two independent filters: which meal it's for, and what kind of dish.
  const [mealFilter, setMealFilter] = useState<'all' | SlotKey>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | Recipe['category']>('all')
  const [search, setSearch] = useState('')
  const [fastingOnly, setFastingOnly] = useState(false)
  // Quick filters on what people actually decide by, plus a sort.
  const [quickOnly, setQuickOnly] = useState(false)
  const [cheapOnly, setCheapOnly] = useState(false)
  const [seasonalOnly, setSeasonalOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('az')

  function handleAddRecipe(recipe: Recipe) {
    onAddRecipe(recipe)
    setIsModalOpen(false)
  }

  const infoById = new Map(recipes.map((r) => [r.id, recipeInfo(r, ingredientCatalog)]))
  const month = new Date().getMonth() + 1
  const currentSeason: Season = month >= 5 && month <= 9 ? 'summer' : month >= 11 || month <= 3 ? 'winter' : null

  const visibleRecipes = recipes
    .filter((recipe) => {
      const info = infoById.get(recipe.id)!
      const matchesMeal = mealFilter === 'all' || (recipe.mealTypes ?? []).includes(mealFilter)
      const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter
      const matchesSearch = recipe.title.toLowerCase().includes(search.trim().toLowerCase())
      const matchesFasting = !fastingOnly || info.fasting
      const matchesQuick = !quickOnly || info.minutes <= 30
      const matchesCheap = !cheapOnly || info.costTier === 'cheap'
      const matchesSeason = !seasonalOnly || info.season === null || info.season === currentSeason
      return matchesMeal && matchesCategory && matchesSearch && matchesFasting && matchesQuick && matchesCheap && matchesSeason
    })
    .sort((a, b) => {
      const x = infoById.get(a.id)!
      const y = infoById.get(b.id)!
      switch (sort) {
        case 'kcal':
          return x.macros.calories - y.macros.calories
        case 'protein':
          return y.macros.protein - x.macros.protein
        case 'cost':
          return x.cost - y.cost
        case 'time':
          return x.minutes - y.minutes
        default:
          return a.title.localeCompare(b.title, 'el')
      }
    })

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-25">
        {/* The tabs sit on a black rule. On phones the search drops below the
            tabs, so the rule goes under the tabs alone (not under the search). */}
        <div data-tour="page-recipes" className="flex flex-wrap items-end justify-between gap-x-20 gap-y-15 sm:border-b-3 sm:border-black">
          <div className="flex gap-10 w-full sm:w-auto border-b-3 border-black sm:border-b-0">
          {(
            [
              { key: 'recipes', label: 'Συνταγές' },
              { key: 'ingredients', label: 'Υλικά' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={
                view === tab.key
                  ? 'font-title font-bold uppercase text-18 px-15 py-10 -mb-[3px] border-3 border-b-0 border-black bg-white cursor-pointer'
                  : 'font-title font-bold uppercase text-18 px-15 py-10 text-neutral-500 hover:text-black cursor-pointer'
              }
            >
              {tab.label}
            </button>
          ))}
          </div>
          {view === 'recipes' && (
            <input
              type="search"
              placeholder="Αναζήτηση συνταγών…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-3 border-black px-15 py-5 sm:mb-10 font-title w-full sm:w-[260px]"
            />
          )}
        </div>

        {view === 'ingredients' ? (
          <IngredientsManager
            catalog={ingredientCatalog}
            recipes={recipes}
            onAdd={onAddIngredientDef}
            onEdit={onEditIngredientDef}
            onDelete={onDeleteIngredientDef}
          />
        ) : (
        <>
        {/* Two filter rows: which meal it's for, and what kind of dish. Labels
            share one width so both rows of chips start at the same line;
            chips that don't fit scroll sideways instead of wrapping. */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-10">
            <span className="text-14 font-title font-bold uppercase text-neutral-500 w-[60px] shrink-0">Γεύμα</span>
            <ScrollRow>
            <button
              type="button"
              onClick={() => setMealFilter('all')}
              className={mealFilter === 'all' ? 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 bg-black text-white' : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5'}
            >
              Όλα
            </button>
            {SLOT_KEYS.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => setMealFilter(slot.value)}
                className={
                  mealFilter === slot.value ? `main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 ${MEAL_ACTIVE[slot.value]}` : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5'
                }
              >
                {slot.label}
              </button>
            ))}
            </ScrollRow>
          </div>

          <div className="flex items-center gap-10">
            <span className="text-14 font-title font-bold uppercase text-neutral-500 w-[60px] shrink-0">Είδος</span>
            <ScrollRow>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={categoryFilter === 'all' ? 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 bg-black text-white' : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5'}
            >
              Όλα
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoryFilter(c.value)}
                className={
                  categoryFilter === c.value ? `main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 text-black px-10 py-5 ${c.color}` : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5'
                }
              >
                {c.label}
              </button>
            ))}
            </ScrollRow>
          </div>

          <div className="flex items-center gap-10">
            <span className="text-14 font-title font-bold uppercase text-neutral-500 w-[60px] shrink-0">Μόνο</span>
            <ScrollRow>
              {(
                [
                  [quickOnly, setQuickOnly, '⚡ Γρήγορα (ως 30\')'],
                  [cheapOnly, setCheapOnly, '€ Οικονομικά'],
                  [fastingOnly, setFastingOnly, '✝ Νηστίσιμα'],
                  [seasonalOnly, setSeasonalOnly, currentSeason === 'summer' ? '☀️ Της εποχής' : '❄️ Της εποχής'],
                ] as const
              ).map(([on, set, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set((v: boolean) => !v)}
                  className={
                    on
                      ? 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 bg-black text-white'
                      : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5'
                  }
                >
                  {label}
                </button>
              ))}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Ταξινόμηση"
                className="shrink-0 bg-white border-3 border-black pl-10 pr-30 py-[3px] font-title font-bold text-14"
              >
                <option value="az">Α → Ω</option>
                <option value="kcal">Λιγότερες θερμίδες</option>
                <option value="protein">Περισσότερη πρωτεΐνη</option>
                <option value="cost">Πιο φθηνά</option>
                <option value="time">Πιο γρήγορα</option>
              </select>
            </ScrollRow>
          </div>
        </div>

        {visibleRecipes.length === 0 && (
          <p className="text-14 font-title text-neutral-500">
            Καμία συνταγή δεν ταιριάζει με τα φίλτρα.{' '}
            <button
              type="button"
              onClick={() => {
                setMealFilter('all')
                setCategoryFilter('all')
                setSearch('')
                setFastingOnly(false)
                setQuickOnly(false)
                setCheapOnly(false)
                setSeasonalOnly(false)
              }}
              className="font-bold text-black underline cursor-pointer"
            >
              Καθαρισμός φίλτρων
            </button>
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-20">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Νέα συνταγή"
            className="main-btn flex items-center justify-center p-20 min-h-100 text-4xl font-title font-bold"
          >
            +
          </button>

          {visibleRecipes.map((recipe) => {
            const category = CATEGORIES.find((c) => c.value === recipe.category)
            const info = infoById.get(recipe.id)!
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onOpenRecipe(recipe.id)}
                className="main-btn flex flex-col p-0 min-h-100 overflow-hidden text-left"
              >
                <span className={`h-10 w-full ${category?.color ?? 'bg-neutral-200'}`} />
                <span className="flex-1 flex flex-col gap-5 p-15">
                  <span className="flex items-center justify-between gap-5 text-12 font-title font-bold uppercase text-neutral-500">
                    {category?.label}
                    {info.fasting && <span title="Νηστίσιμο">✝</span>}
                  </span>
                  <span className="flex-1 font-title font-bold uppercase leading-tight">{recipe.title}</span>
                  {/* At a glance: time, price, calories per portion */}
                  <span className="flex flex-wrap gap-x-10 gap-y-[2px] text-12 font-title text-neutral-600 pt-5 border-t border-neutral-200">
                    <span>⏱ {formatMinutes(info.minutes)}</span>
                    <span title={`~${formatEuro(info.cost)} τη μερίδα`}>{COST_LABEL[info.costTier]}</span>
                    <span>{Math.round(info.macros.calories)} kcal</span>
                  </span>
                </span>
              </button>
            )
          })}

        </div>

        </>
        )}

        {isModalOpen && (
          <AddRecipeModal
            ingredientCatalog={ingredientCatalog}
            onAddIngredientDef={onAddIngredientDef}
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddRecipe}
          />
        )}
      </div>
    </div>
  )
}

export default Recipes
