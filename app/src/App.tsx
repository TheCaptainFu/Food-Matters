import Header from './components/Header'
import Subheader, { type TabKey } from './components/Subheader'
import Recipes from './components/Recipes'
import Calendar from './components/Calendar'
import Market from './components/Market'
import Leftovers from './components/Leftovers'
import Calories from './components/Calories'
import RecipeDetailModal from './components/RecipeDetailModal'
import AddRecipeModal from './components/AddRecipeModal'
import ConfirmModal from './components/ConfirmModal'
import { useEffect, useState } from 'react'
import type { Recipe, Week, IngredientDef, Ingredient } from './types'
import { SLOT_KEYS } from './types'
import type { Profile } from './nutrition'
import { normalizeProfile } from './nutrition'
import { SAMPLE_RECIPES } from './sampleRecipes'
import { makeWeek } from './weekUtils'
import { DEFAULT_INGREDIENT_CATALOG } from './ingredientCatalog'
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
const CURRENT_CATALOG_VERSION = 2

// Same idea, but for the seeded recipe library.
const CURRENT_RECIPES_VERSION = 2

const ALL_SLOT_KEYS = SLOT_KEYS.map((s) => s.value)

function ingredientsMatch(a: Ingredient[], b: Ingredient[]): boolean {
  if (a.length !== b.length) return false
  return a.every((ing, i) => ing.name === b[i].name && ing.amount === b[i].amount && ing.unit === b[i].unit)
}

function initRecipes(): Recipe[] {
  const stored = loadFromStorage<Recipe[] | null>(RECIPES_KEY, null)
  if (!stored) return SAMPLE_RECIPES

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
    const isUnmodifiedSeed = !!sample && ingredientsMatch(r.ingredients, sample.ingredients)
    if (isUnmodifiedSeed) {
      return { ...r, mealTypes: sample.mealTypes, instructions: sample.instructions ?? r.instructions }
    }
    return {
      ...r,
      mealTypes: r.mealTypes && r.mealTypes.length > 0 ? r.mealTypes : (sample?.mealTypes ?? ALL_SLOT_KEYS),
      instructions: r.instructions ?? sample?.instructions,
    }
  })

  const version = loadFromStorage(RECIPES_VERSION_KEY, 0)
  if (version >= CURRENT_RECIPES_VERSION) return normalized

  const existingTitles = new Set(normalized.map((r) => r.title.toLowerCase()))
  const missing = SAMPLE_RECIPES.filter((r) => !existingTitles.has(r.title.toLowerCase()))
  return [...normalized, ...missing]
}

function initIngredientCatalog(): IngredientDef[] {
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
    }
  })

  const version = loadFromStorage(INGREDIENT_CATALOG_VERSION_KEY, 0)
  if (version >= CURRENT_CATALOG_VERSION) return normalized

  const existingNames = new Set(normalized.map((c) => c.name.toLowerCase()))
  const missing = DEFAULT_INGREDIENT_CATALOG.filter((c) => !existingNames.has(c.name.toLowerCase()))
  return [...normalized, ...missing].sort((a, b) => a.name.localeCompare(b.name))
}

function App() {
  // A brand-new visitor (no profile saved yet) lands on Calories, where the
  // profile wizard opens automatically — not on an empty Calendar with no
  // explanation of what to do next.
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    loadFromStorage<Partial<Profile> | null>(PROFILE_KEY, null) ? 'calendar' : 'calories',
  )
  const [recipes, setRecipes] = useState<Recipe[]>(initRecipes)

  // New users start with an empty Week 1 — no demo meals already assigned —
  // so the plan they see is only ever one they (or Generate Week) built.
  const [weeks, setWeeks] = useState<Week[]>(() => loadFromStorage(WEEKS_KEY, [makeWeek('Week 1')]))
  const [activeWeekId, setActiveWeekId] = useState(weeks[0].id)

  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientDef[]>(initIngredientCatalog)

  const [profile, setProfile] = useState<Profile | null>(() => {
    const stored = loadFromStorage<Partial<Profile> | null>(PROFILE_KEY, null)
    return stored ? normalizeProfile(stored) : null
  })

  // Mobile-only nav drawer, toggled by the burger button (hidden on
  // desktop, where the tab row is always visible).
  const [isNavOpen, setIsNavOpen] = useState(false)

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab)
    setIsNavOpen(false)
  }

  function handleAddIngredientDef(def: IngredientDef) {
    setIngredientCatalog((prev) =>
      prev.some((c) => c.name.toLowerCase() === def.name.toLowerCase())
        ? prev
        : [...prev, def].sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  function handleEditIngredientDef(oldName: string, def: IngredientDef) {
    setIngredientCatalog((prev) =>
      prev.map((c) => (c.name === oldName ? def : c)).sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  function handleDeleteIngredientDef(name: string) {
    setIngredientCatalog((prev) => prev.filter((c) => c.name !== name))
  }

  useEffect(() => {
    saveToStorage(RECIPES_KEY, recipes)
    saveToStorage(RECIPES_VERSION_KEY, CURRENT_RECIPES_VERSION)
  }, [recipes])

  useEffect(() => {
    saveToStorage(WEEKS_KEY, weeks)
  }, [weeks])

  useEffect(() => {
    saveToStorage(INGREDIENT_CATALOG_KEY, ingredientCatalog)
    saveToStorage(INGREDIENT_CATALOG_VERSION_KEY, CURRENT_CATALOG_VERSION)
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

  function handleUpdateRecipe(recipe: Recipe) {
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)))
  }

  function handleDeleteRecipe(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      <Header isMenuOpen={isNavOpen} onToggleMenu={() => setIsNavOpen((v) => !v)} />
      <Subheader
        activeTab={activeTab}
        onChange={handleTabChange}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
      />
      {activeTab === 'recipes' && (
        <Recipes
          recipes={recipes}
          ingredientCatalog={ingredientCatalog}
          onAddIngredientDef={handleAddIngredientDef}
          onEditIngredientDef={handleEditIngredientDef}
          onDeleteIngredientDef={handleDeleteIngredientDef}
          onAddRecipe={handleAddRecipe}
          onOpenRecipe={setOpenRecipeId}
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
          activeWeekId={activeWeekId}
          setActiveWeekId={setActiveWeekId}
        />
      )}
      {activeTab === 'market' && <Market recipes={recipes} weeks={weeks} ingredientCatalog={ingredientCatalog} />}
      {activeTab === 'leftovers' && (
        <Leftovers recipes={recipes} ingredientCatalog={ingredientCatalog} onOpenRecipe={setOpenRecipeId} />
      )}
      {activeTab === 'calories' && (
        <Calories
          recipes={recipes}
          weeks={weeks}
          ingredientCatalog={ingredientCatalog}
          profile={profile}
          onSaveProfile={setProfile}
          onOpenRecipe={setOpenRecipeId}
        />
      )}

      {openRecipe && !editingRecipe && (
        <RecipeDetailModal
          recipe={openRecipe}
          ingredientCatalog={ingredientCatalog}
          onClose={() => setOpenRecipeId(null)}
          onEdit={() => setEditingRecipe(openRecipe)}
          onDelete={() => setConfirmDeleteId(openRecipe.id)}
        />
      )}

      {editingRecipe && (
        <AddRecipeModal
          initialRecipe={editingRecipe}
          ingredientCatalog={ingredientCatalog}
          onAddIngredientDef={handleAddIngredientDef}
          onEditIngredientDef={handleEditIngredientDef}
          onDeleteIngredientDef={handleDeleteIngredientDef}
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
    </>
  )
}


export default App
