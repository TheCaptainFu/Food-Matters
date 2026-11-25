import { useState } from 'react'
import AddRecipeModal from './AddRecipeModal'
import { recipeInfo, formatMinutes, formatEuro, COST_LABEL, type Season } from '../recipeTraits'
import ScrollRow from './ScrollRow'
import CrossIcon from './CrossIcon'
import HeartIcon from './HeartIcon'
import IngredientsManager from './IngredientsManager'
import type { Recipe, IngredientDef, SlotKey } from '../types'
import { CATEGORIES, SLOT_KEYS, isOutsideFood } from '../types'
import { matchesSearch as textMatches } from '../text'

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
  onToggleFavorite: (id: string) => void
}

function Recipes({
  recipes,
  ingredientCatalog,
  onAddIngredientDef,
  onEditIngredientDef,
  onDeleteIngredientDef,
  onAddRecipe,
  onOpenRecipe,
  onToggleFavorite,
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
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('az')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    [favoritesOnly, quickOnly, cheapOnly, fastingOnly, seasonalOnly].filter(Boolean).length +
    (sort !== 'az' ? 1 : 0)
  const clearFilters = () => {
    setCategoryFilter('all')
    setFavoritesOnly(false)
    setFastingOnly(false)
    setQuickOnly(false)
    setCheapOnly(false)
    setSeasonalOnly(false)
    setSort('az')
  }

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
      const matchesSearch = textMatches(recipe.title, search)
      const matchesFasting = !fastingOnly || info.fasting
      // Quick and cheap are about cooking — ready food isn't counted.
      const cooked = recipe.ingredients.length > 0
      const matchesQuick = !quickOnly || (cooked && info.minutes <= 30)
      const matchesCheap = !cheapOnly || (cooked && info.costTier === 'cheap')
      const matchesSeason = !seasonalOnly || info.season === null || info.season === currentSeason
      const matchesFavorite = !favoritesOnly || !!recipe.favorite
      return matchesFavorite && matchesMeal && matchesCategory && matchesSearch && matchesFasting && matchesQuick && matchesCheap && matchesSeason
    })
    .sort((a, b) => {
      // ♥ first, then home cooking, then coffee, souvlaki, bakery…
      const fav = Number(!!b.favorite) - Number(!!a.favorite)
      if (fav !== 0) return fav
      const out = Number(isOutsideFood(a.category)) - Number(isOutsideFood(b.category))
      if (out !== 0) return out
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

  const selectedCategory = CATEGORIES.find((c) => c.value === categoryFilter)

  // Nothing narrowed down yet: show rows by kind instead of one long grid.
  const browsing =
    !search.trim() &&
    mealFilter === 'all' &&
    categoryFilter === 'all' &&
    !fastingOnly &&
    !quickOnly &&
    !cheapOnly &&
    !seasonalOnly &&
    !favoritesOnly

  // inRow: inside a row titled with the kind, so the card doesn't repeat it.
  // The ♥ is its own button laid over the card (a button can't hold one).
  function renderCard(recipe: Recipe, extraClass = '', inRow = false) {
    const category = CATEGORIES.find((c) => c.value === recipe.category)
    const info = infoById.get(recipe.id)!
    return (
      <div key={recipe.id} className={`relative flex ${extraClass}`}>
        <button
          type="button"
          onClick={() => onOpenRecipe(recipe.id)}
          className="main-btn flex-1 flex flex-col p-0 min-h-[190px] overflow-hidden text-left"
        >
          <span className={`h-[14px] w-full shrink-0 ${category?.color ?? 'bg-neutral-200'}`} />
          <span className="flex-1 flex flex-col gap-10 p-10 sm:p-15">
            {!inRow && (
              <span
                className={`self-start px-5 py-[1px] text-12 font-title font-bold uppercase border-2 border-black text-black ${category?.color ?? 'bg-neutral-200'}`}
              >
                {category?.label}
              </span>
            )}
            {/* Room on the right of the first line for the ♥. */}
            <span className={`text-16 sm:text-18 font-title font-bold uppercase leading-tight ${inRow ? 'pr-30' : ''}`}>
              {recipe.title}
            </span>
            {/* Middle: protein / carbs / fat, and the fasting mark. */}
            <span className="mt-auto flex flex-wrap items-center gap-x-10 gap-y-[2px] text-12 font-title font-bold text-neutral-600">
              <span className="whitespace-nowrap">Π {Math.round(info.macros.protein)}g</span>
              <span className="whitespace-nowrap">Υ {Math.round(info.macros.carbs)}g</span>
              <span className="whitespace-nowrap">Λ {Math.round(info.macros.fat)}g</span>
              {info.fasting && (
                <span title="Νηστίσιμο" className="ml-auto text-main-blue">
                  <CrossIcon size={12} />
                </span>
              )}
            </span>
            {/* Time and price bottom-left, calories bottom-right — one line. */}
            <span className="flex items-center justify-between gap-5 text-12 sm:text-14 font-title text-black pt-10 border-t border-neutral-200">
              {/* Ready food has no cooking time or ingredient cost. */}
              {recipe.ingredients.length > 0 ? (
                <span className="min-w-0 flex items-center gap-5 font-bold whitespace-nowrap overflow-hidden">
                  <span>⏱ {formatMinutes(info.minutes)}</span>
                  <span title={`~${formatEuro(info.cost)} τη μερίδα`}>{COST_LABEL[info.costTier]}</span>
                </span>
              ) : (
                <span />
              )}
              <span className="shrink-0 px-5 py-[1px] bg-main-blue text-white font-bold whitespace-nowrap">
                {Math.round(info.macros.calories)} kcal
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(recipe.id)}
          aria-pressed={!!recipe.favorite}
          aria-label={recipe.favorite ? `${recipe.title}: αφαίρεση από τα αγαπημένα` : `${recipe.title}: στα αγαπημένα`}
          className={`absolute right-[8px] w-[30px] h-[30px] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${
            inRow ? 'top-[20px]' : 'top-[18px]'
          }`}
        >
          <HeartIcon on={!!recipe.favorite} size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-25">
        {/* The tabs sit on a black rule. On phones the search drops below the
            tabs, so the rule goes under the tabs alone (not under the search). */}
        <div data-tour="page-recipes" className="flex flex-wrap items-end justify-between gap-x-20 gap-y-15 sm:border-b-3 sm:border-black">
          <div className="flex gap-10 w-full sm:w-auto border-b-3 border-black sm:border-b-0">
          {(
            [
              { key: 'recipes', label: 'Φαγητά' },
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
            <div className="flex gap-10 w-full sm:w-auto sm:mb-10">
              <input
                type="search"
                placeholder="Αναζήτηση φαγητών…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-3 border-black px-15 py-5 font-title flex-1 min-w-0 sm:w-[260px]"
              />
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                data-tour="recipes-add"
                className="main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 bg-main-yellow"
              >
                + Νέο φαγητό
              </button>
            </div>
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
        {/* Meal chips stay in sight; everything else (kind, "only", sort) folds
            into one "Φίλτρα" button so the page opens on the food, not on
            three rows of chips. The button shows how many are switched on. */}
        <div data-tour="recipes-filters" className="flex flex-col gap-10">
          <div className="flex items-center gap-10">
            <div className="flex-1 min-w-0">
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
            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              aria-expanded={isFiltersOpen}
              className={`main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 flex items-center gap-5 ${
                isFiltersOpen ? 'bg-main-yellow' : ''
              }`}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6 H20 M7 12 H17 M10 18 H14" />
              </svg>
              Φίλτρα
              {activeFilterCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-[3px] bg-main-blue text-white text-12 leading-none flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {isFiltersOpen && (
            <div className="border-3 border-black bg-white p-10 flex flex-col gap-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
                <span className="text-14 font-title font-bold uppercase text-neutral-500 w-[60px] shrink-0">Μόνο</span>
                <ScrollRow>
              {(
                [
                  ['fav', favoritesOnly, setFavoritesOnly, <><HeartIcon on size={14} /> Αγαπημένα</>],
                  ['quick', quickOnly, setQuickOnly, '⚡ Γρήγορα (ως 30\')'],
                  ['cheap', cheapOnly, setCheapOnly, '€ Οικονομικά'],
                  ['fast', fastingOnly, setFastingOnly, <><CrossIcon size={12} /> Νηστίσιμα</>],
                  ['season', seasonalOnly, setSeasonalOnly, currentSeason === 'summer' ? '☀️ Της εποχής' : '❄️ Της εποχής'],
                ] as const
              ).map(([key, on, set, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set((v: boolean) => !v)}
                  className={`main-btn shrink-0 whitespace-nowrap font-title font-bold text-14 px-10 py-5 flex items-center gap-5 ${
                    on ? 'bg-black text-white' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
                </ScrollRow>
              </div>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
                <span className="text-14 font-title font-bold uppercase text-neutral-500 w-full sm:w-[60px] shrink-0">Σειρά</span>
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
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto font-title font-bold text-14 underline cursor-pointer"
                  >
                    Καθαρισμός
                  </button>
                )}
              </div>
            </div>
          )}
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
                setFavoritesOnly(false)
              }}
              className="font-bold text-black underline cursor-pointer"
            >
              Καθαρισμός φίλτρων
            </button>
          </p>
        )}

        {browsing ? (
          /* No search or filter: one row per kind of food, swiped sideways —
             a quick look at everything without 300 cards in a wall. */
          <div className="flex flex-col gap-25">
            {/* ♥ first: what you eat often, without searching. */}
            {visibleRecipes.some((r) => r.favorite) && (
              <section className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-10">
                  <h3 className="px-5 py-[2px] text-14 font-title font-bold uppercase border-2 border-black bg-white flex items-center gap-5">
                    <HeartIcon on size={14} /> Αγαπημένα
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setFavoritesOnly(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="shrink-0 text-14 font-title font-bold underline cursor-pointer"
                  >
                    Όλα ({visibleRecipes.filter((r) => r.favorite).length}) →
                  </button>
                </div>
                <ScrollRow wheel={false} className="-mx-20 px-20 pb-10 gap-15">
                  {visibleRecipes
                    .filter((r) => r.favorite)
                    .map((recipe) => renderCard(recipe, 'w-[200px] sm:w-[240px] shrink-0'))}
                </ScrollRow>
              </section>
            )}
            {CATEGORIES.map((c) => {
              const items = visibleRecipes.filter((r) => r.category === c.value)
              if (items.length === 0) return null
              return (
                <section key={c.value} className="flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-10">
                    <h3
                      className={`px-5 py-[2px] text-14 font-title font-bold uppercase border-2 border-black text-black ${c.color}`}
                    >
                      {c.label}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter(c.value)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="shrink-0 text-14 font-title font-bold underline cursor-pointer"
                    >
                      Όλα ({items.length}) →
                    </button>
                  </div>
                  <ScrollRow wheel={false} className="-mx-20 px-20 pb-10 gap-15">
                    {items.map((recipe) => renderCard(recipe, 'w-[200px] sm:w-[240px] shrink-0', true))}
                  </ScrollRow>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-15">
            {/* One kind picked: its label once on top, like the rows, and the
                cards without it. */}
            {selectedCategory && (
              <div className="flex items-center justify-between gap-10">
                <h3
                  className={`px-5 py-[2px] text-14 font-title font-bold uppercase border-2 border-black text-black ${selectedCategory.color}`}
                >
                  {selectedCategory.label}
                </h3>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="shrink-0 text-14 font-title font-bold underline cursor-pointer"
                >
                  ← Όλα τα είδη
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-20">
              {visibleRecipes.map((recipe) => renderCard(recipe, '', !!selectedCategory))}
            </div>
          </div>
        )}

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
