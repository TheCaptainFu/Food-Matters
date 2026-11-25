import Header from './components/Header'
import Footer from './components/Footer'
import Today from './components/Today'
import Onboarding from './components/Onboarding'
import TourGuide from './components/TourGuide'
import Subheader, { type TabKey } from './components/Subheader'
import Recipes from './components/Recipes'
import Calendar from './components/Calendar'
import Market from './components/Market'
import Leftovers from './components/Leftovers'
import Calories from './components/Calories'
import RecipeDetailModal from './components/RecipeDetailModal'
import AddRecipeModal from './components/AddRecipeModal'
import ConfirmModal from './components/ConfirmModal'
import ProfileModal from './components/ProfileModal'
import { useAuth, signInWithProvider } from './useAuth'
import { supabase } from './supabaseClient'
import { useEffect, useState } from 'react'
import type { Recipe, Week, IngredientDef, Ingredient } from './types'
import { SLOT_KEYS } from './types'
import type { Profile } from './nutrition'
import { normalizeProfile } from './nutrition'
import { SAMPLE_RECIPES } from './sampleRecipes'
import { addDays, makeWeek, mondayOf, sortWeeks, toISODate, weekLabel } from './weekUtils'
import { DEFAULT_INGREDIENT_CATALOG } from './ingredientCatalog'
import { toNaturalUnit } from './quantities'
import { loadFromStorage, saveToStorage } from './storage'

const RECIPES_KEY = 'food-matters-recipes'
const RECIPES_VERSION_KEY = 'food-matters-recipes-version'
const WEEKS_KEY = 'food-matters-weeks'
const INGREDIENT_CATALOG_KEY = 'food-matters-ingredient-catalog'
const INGREDIENT_CATALOG_VERSION_KEY = 'food-matters-ingredient-catalog-version'
const PROFILE_KEY = 'food-matters-profile'

// Bump this whenever DEFAULT_INGREDIENT_CATALOG grows — existing users get
// the new entries merged into their saved catalog once, without touching
// anything they've already added, edited, or deleted themselves.
const CURRENT_CATALOG_VERSION = 5

// Same idea, but for the seeded recipe library.
const CURRENT_RECIPES_VERSION = 10

const ALL_SLOT_KEYS = SLOT_KEYS.map((s) => s.value)

function ingredientsMatch(a: Ingredient[], b: Ingredient[]): boolean {
  if (a.length !== b.length) return false
  return a.every((ing, i) => ing.name === b[i].name && ing.amount === b[i].amount && ing.unit === b[i].unit)
}

// Seed recipes we renamed: a copy saved under the old name is dropped, so
// the current one doesn't show up next to it.
const RETIRED_SEED_TITLES = new Set(['σνίτσελ χοιρινό με πατάτες φούρνου'])

// The version is recorded when the merge below actually ran — not on every
// save — so a hot reload during development (state kept, merge skipped)
// can't mark new seeds as already added.
// Read once per page load, so React calling the initializer twice (strict
// mode) sees the same saved version both times.
const SAVED_RECIPES_VERSION = loadFromStorage(RECIPES_VERSION_KEY, 0)
const SAVED_CATALOG_VERSION = loadFromStorage(INGREDIENT_CATALOG_VERSION_KEY, 0)

function initRecipes(): Recipe[] {
  saveToStorage(RECIPES_VERSION_KEY, CURRENT_RECIPES_VERSION)
  return mergeSavedRecipes(SAVED_RECIPES_VERSION)
}

function mergeSavedRecipes(version: number): Recipe[] {
  const saved = loadFromStorage<Recipe[] | null>(RECIPES_KEY, null)
  if (!saved) return SAMPLE_RECIPES
  // One entry per id: a recipe saved twice (or an old copy of a renamed
  // seed sharing its id) would otherwise be listed again and again.
  const seenIds = new Set<string>()
  const stored = saved.filter((r) => {
    if (RETIRED_SEED_TITLES.has(r.title.toLowerCase()) || seenIds.has(r.id)) return false
    seenIds.add(r.id)
    return true
  })

  const sampleByTitle = new Map(SAMPLE_RECIPES.map((r) => [r.title.toLowerCase(), r]))

  // Recipes saved before mealTypes/instructions existed don't have them —
  // backfill from the matching seed recipe (or fall back to "every meal"
  // for mealTypes on recipes the user made themselves) instead of crashing
  // or silently missing the new fields. Never touches a user's own
  // instructions if they already wrote some.
  //
  // For a seed recipe the user never edited (its ingredients still match
  // the sample exactly), we go further and always resync mealTypes/
  // instructions to the current sample values — so if we later fine-tune a
  // recipe's meal tagging (e.g. Risotto shouldn't be a breakfast option),
  // that correction reaches users who already have it saved from an
  // earlier, less-refined tagging pass. A recipe the user has actually
  // edited (different ingredients) is left alone — its mealTypes are their
  // choice, not ours to override.
  const normalized = stored.map((r) => {
    const sample = sampleByTitle.get(r.title.toLowerCase())
    // Seeds saved while they were written all in grams count as unmodified
    // too, so they pick up pieces ("2 αυγά") like fresh ones.
    // (Ready food has no ingredients: its typed-in calories decide.)
    const isUnmodifiedSeed =
      !!sample &&
      JSON.stringify(r.fixedMacros ?? null) === JSON.stringify(sample.fixedMacros ?? null) &&
      (ingredientsMatch(r.ingredients, sample.ingredients) ||
        ingredientsMatch(
          r.ingredients.map((ing) => toNaturalUnit(ing, DEFAULT_INGREDIENT_CATALOG)),
          sample.ingredients,
        ))
    if (isUnmodifiedSeed) {
      return {
        ...r,
        mealTypes: sample.mealTypes,
        instructions: sample.instructions ?? r.instructions,
        ingredients: sample.ingredients,
        servings: sample.servings,
        category: sample.category,
        minutes: sample.minutes,
        difficulty: sample.difficulty,
        keepsDays: sample.keepsDays,
        fixedMacros: sample.fixedMacros,
      }
    }
    return {
      ...r,
      mealTypes: r.mealTypes && r.mealTypes.length > 0 ? r.mealTypes : (sample?.mealTypes ?? ALL_SLOT_KEYS),
      instructions: r.instructions ?? sample?.instructions,
    }
  })

  if (version >= CURRENT_RECIPES_VERSION) return normalized

  const existingTitles = new Set(normalized.map((r) => r.title.toLowerCase()))
  const missing = SAMPLE_RECIPES.filter((r) => !existingTitles.has(r.title.toLowerCase()) && !seenIds.has(r.id))
  return [...normalized, ...missing]
}

function initIngredientCatalog(): IngredientDef[] {
  saveToStorage(INGREDIENT_CATALOG_VERSION_KEY, CURRENT_CATALOG_VERSION)
  return mergeSavedCatalog(SAVED_CATALOG_VERSION)
}

function mergeSavedCatalog(version: number): IngredientDef[] {
  const stored = loadFromStorage<IngredientDef[] | null>(INGREDIENT_CATALOG_KEY, null)
  if (!stored) return DEFAULT_INGREDIENT_CATALOG

  const defaultsByName = new Map(DEFAULT_INGREDIENT_CATALOG.map((d) => [d.name.toLowerCase(), d]))
  const normalized = stored.map((raw) => {
    const fallback = defaultsByName.get(raw.name.toLowerCase())
    return {
      name: raw.name,
      // Ingredients saved before shopping-list categories existed don't
      // have one — backfill from the matching default entry, or "Other"
      // for something the user added themselves.
      category: raw.category ?? fallback?.category ?? 'other',
      caloriesPer100g: raw.caloriesPer100g ?? fallback?.caloriesPer100g ?? 0,
      proteinPer100g: raw.proteinPer100g ?? fallback?.proteinPer100g ?? 0,
      carbsPer100g: raw.carbsPer100g ?? fallback?.carbsPer100g ?? 0,
      fatPer100g: raw.fatPer100g ?? fallback?.fatPer100g ?? 0,
      gramsPerPiece: raw.gramsPerPiece ?? fallback?.gramsPerPiece,
      pieceName: raw.pieceName ?? fallback?.pieceName,
    }
  })

  if (version >= CURRENT_CATALOG_VERSION) return normalized

  const existingNames = new Set(normalized.map((c) => c.name.toLowerCase()))
  const missing = DEFAULT_INGREDIENT_CATALOG.filter((c) => !existingNames.has(c.name.toLowerCase()))
  return [...normalized, ...missing].sort((a, b) => a.name.localeCompare(b.name, 'el'))
}

function initWeeks(): Week[] {
  const thisMonday = mondayOf(new Date())
  const stored = loadFromStorage<Partial<Week>[] | null>(WEEKS_KEY, null)
  if (!stored || stored.length === 0) return [makeWeek(toISODate(thisMonday))]

  // Weeks saved before "what you actually ate" existed have days without an
  // `actual` field — backfill an empty one so logging works immediately.
  // Weeks saved before weeks had dates ("Week 1", "Week 2"…) get
  // consecutive Mondays starting from this week, in their saved order.
  return sortWeeks(
    stored.map((week, i) => {
      const startDate = week.startDate ?? toISODate(addDays(thisMonday, i * 7))
      return {
        id: week.id ?? crypto.randomUUID(),
        startDate,
        label: weekLabel(startDate),
        days: (week.days ?? []).map((day) => ({
          ...day,
          actual: day.actual ?? {},
          // Extras were briefly one list per day — file those under dinner.
          extras: Array.isArray(day.extras) ? { dinner: day.extras } : day.extras,
        })),
      }
    }),
  )
}

function App() {
  const { user } = useAuth()

  // A brand-new visitor (no profile saved yet) lands on Calories, where the
  // profile wizard opens automatically — not on an empty Calendar with no
  // explanation of what to do next.
  // Everyone lands on Σήμερα, the home page; a brand-new visitor also gets
  // the short welcome wizard on top of it.
  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [recipes, setRecipes] = useState<Recipe[]>(initRecipes)

  // New users start with an empty Week 1 — no demo meals already assigned —
  // so the plan they see is only ever one they (or Generate Week) built.
  const [weeks, setWeeks] = useState<Week[]>(initWeeks)
  // Meal Plan opens on the current week; its ‹ › arrows move from there.
  const [activeWeekStart, setActiveWeekStart] = useState(() => toISODate(mondayOf(new Date())))

  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientDef[]>(initIngredientCatalog)

  const [profile, setProfile] = useState<Profile | null>(() => {
    const stored = loadFromStorage<Partial<Profile> | null>(PROFILE_KEY, null)
    return stored ? normalizeProfile(stored) : null
  })

  // Mobile-only nav drawer, toggled by the burger button (hidden on
  // desktop, where the tab row is always visible).

  // Opens automatically for a brand-new visitor (no profile yet) regardless
  // of which tab they land on, same as the old Calories-only wizard did —
  // just not tied to being on that specific tab anymore.
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!profile)
  // Σήμερα's "plan my week" goes to Πρόγραμμα with the questions already open.
  const [planWizardOnOpen, setPlanWizardOnOpen] = useState(false)
  // The guided tour: right after the welcome, or from "Βοήθεια" in the menu.
  const [isTourOpen, setIsTourOpen] = useState(false)

  function planWeek() {
    setActiveWeekStart(toISODate(mondayOf(new Date())))
    setPlanWizardOnOpen(true)
    handleTabChange('calendar')
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab)
    // Each tab is a different page — start it at the top, not wherever the
    // previous tab happened to be scrolled to.
    window.scrollTo(0, 0)
  }

  // Renaming an ingredient renames it inside every recipe too — recipes
  // refer to ingredients by name, so otherwise they'd lose their nutrition.
  function handleEditIngredientDef(oldName: string, def: IngredientDef) {
    setIngredientCatalog((prev) =>
      prev.map((c) => (c.name === oldName ? def : c)).sort((a, b) => a.name.localeCompare(b.name, 'el')),
    )
    if (def.name !== oldName) {
      setRecipes((prev) =>
        prev.map((r) => ({
          ...r,
          ingredients: r.ingredients.map((ing) => (ing.name === oldName ? { ...ing, name: def.name } : ing)),
        })),
      )
    }
  }

  // Only offered for ingredients no recipe uses (see IngredientsManager).
  function handleDeleteIngredientDef(name: string) {
    setIngredientCatalog((prev) => prev.filter((c) => c.name !== name))
  }

  function handleAddIngredientDef(def: IngredientDef) {
    setIngredientCatalog((prev) =>
      prev.some((c) => c.name.toLowerCase() === def.name.toLowerCase())
        ? prev
        : [...prev, def].sort((a, b) => a.name.localeCompare(b.name, 'el')),
    )
  }

  useEffect(() => {
    saveToStorage(RECIPES_KEY, recipes)
  }, [recipes])

  useEffect(() => {
    saveToStorage(WEEKS_KEY, weeks)
  }, [weeks])

  useEffect(() => {
    saveToStorage(INGREDIENT_CATALOG_KEY, ingredientCatalog)
  }, [ingredientCatalog])

  useEffect(() => {
    if (profile) saveToStorage(PROFILE_KEY, profile)
  }, [profile])

  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const openRecipe = recipes.find((r) => r.id === openRecipeId) ?? null
  const confirmDeleteRecipe = recipes.find((r) => r.id === confirmDeleteId) ?? null

  function handleAddRecipe(recipe: Recipe) {
    setRecipes((prev) => [...prev, recipe])
  }

  // The edit form doesn't know about ♥, so an edit keeps it.
  function handleUpdateRecipe(recipe: Recipe) {
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...recipe, favorite: r.favorite } : r)))
  }

  function handleToggleFavorite(id: string) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)))
  }

  function handleDeleteRecipe(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  // No login wall: everyone starts as a guest (local-only data). Signing in
  // is optional and offered from the menu while Supabase is configured.
  const canSignIn = !!supabase && !user

  return (
    // Room at the bottom on phones for the page bar.
    <div className="min-h-screen flex flex-col pb-[calc(62px+env(safe-area-inset-bottom))] tab:pb-0">
      <Header
        onHelp={() => setIsTourOpen(true)}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
      <Subheader
        activeTab={activeTab}
        onChange={handleTabChange}
        onSignIn={canSignIn ? () => signInWithProvider('google') : undefined}
        onHelp={() => setIsTourOpen(true)}
      />
      {activeTab === 'today' && (
        <Today
          onAddRecipe={handleAddRecipe}
          onAddIngredientDef={handleAddIngredientDef}
          recipes={recipes}
          weeks={weeks}
          setWeeks={setWeeks}
          ingredientCatalog={ingredientCatalog}
          profile={profile}
          onOpenRecipe={setOpenRecipeId}
          onOpenProfile={() => (profile ? setIsProfileOpen(true) : setIsOnboardingOpen(true))}
          onGoTo={handleTabChange}
          onPlanWeek={planWeek}
        />
      )}
      {activeTab === 'recipes' && (
        <Recipes
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          onAddIngredientDef={handleAddIngredientDef}
          onEditIngredientDef={handleEditIngredientDef}
          onDeleteIngredientDef={handleDeleteIngredientDef}
          onAddRecipe={handleAddRecipe}
          onOpenRecipe={setOpenRecipeId}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
      {activeTab === 'calendar' && (
        <Calendar
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          profile={profile}
          onOpenRecipe={setOpenRecipeId}
          weeks={weeks}
          setWeeks={setWeeks}
          activeWeekStart={activeWeekStart}
          setActiveWeekStart={setActiveWeekStart}
          onOpenProfile={() => setIsProfileOpen(true)}
          onAddRecipe={handleAddRecipe}
          onAddIngredientDef={handleAddIngredientDef}
          startWithPlanWizard={planWizardOnOpen && !!profile}
          onPlanWizardClosed={() => setPlanWizardOnOpen(false)}
        />
      )}
      {activeTab === 'market' && (
        <Market
          recipes={recipes}
          weeks={weeks}
          ingredientCatalog={ingredientCatalog}
          activeWeekStart={activeWeekStart}
          setActiveWeekStart={setActiveWeekStart}
          onGoToFridge={() => handleTabChange('leftovers')}
        />
      )}
      {activeTab === 'leftovers' && (
        <Leftovers
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          profile={profile}
          onOpenRecipe={setOpenRecipeId}
        />
      )}
      {activeTab === 'calories' && (
        <Calories
          onAddRecipe={handleAddRecipe}
          onAddIngredientDef={handleAddIngredientDef}
          recipes={recipes}
          weeks={weeks}
          setWeeks={setWeeks}
          ingredientCatalog={ingredientCatalog}
          profile={profile}
          onOpenRecipe={setOpenRecipeId}
          onOpenProfile={() => setIsProfileOpen(true)}
          onGoToCalendar={() => handleTabChange('calendar')}
          onGoToToday={() => handleTabChange('today')}
        />
      )}

      <Footer />

      {isOnboardingOpen && (
        <Onboarding
          ingredientCatalog={ingredientCatalog}
          onFinish={(newProfile) => {
            setProfile(newProfile)
            setIsOnboardingOpen(false)
            setIsTourOpen(true)
          }}
          onSkip={() => setIsOnboardingOpen(false)}
        />
      )}

      {isTourOpen && (
        <TourGuide
          onNavigate={handleTabChange}
          onPlanWeek={() => (profile ? planWeek() : setIsOnboardingOpen(true))}
          onClose={() => setIsTourOpen(false)}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          profile={profile}
          ingredientCatalog={ingredientCatalog}
          user={user}
          onSaveProfile={setProfile}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {openRecipe && !editingRecipe && (
        <RecipeDetailModal
          recipe={openRecipe}
          ingredientCatalog={ingredientCatalog}
          onClose={() => setOpenRecipeId(null)}
          onEdit={() => setEditingRecipe(openRecipe)}
          onDelete={() => setConfirmDeleteId(openRecipe.id)}
          onToggleFavorite={() => handleToggleFavorite(openRecipe.id)}
        />
      )}

      {editingRecipe && (
        <AddRecipeModal
          initialRecipe={editingRecipe}
          ingredientCatalog={ingredientCatalog}
          onAddIngredientDef={handleAddIngredientDef}
          onClose={() => setEditingRecipe(null)}
          onSave={(recipe) => {
            handleUpdateRecipe(recipe)
            setEditingRecipe(null)
            setOpenRecipeId(null)
          }}
        />
      )}

      {confirmDeleteRecipe && (
        <ConfirmModal
          message={`Delete "${confirmDeleteRecipe.title}"? This cannot be undone.`}
          onConfirm={() => {
            handleDeleteRecipe(confirmDeleteRecipe.id)
            setConfirmDeleteId(null)
            setOpenRecipeId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}


export default App
