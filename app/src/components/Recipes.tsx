import { useState } from 'react'
import AddRecipeModal from './AddRecipeModal'
import type { Recipe, IngredientDef } from '../types'
import { CATEGORIES } from '../types'

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
  const [categoryFilter, setCategoryFilter] = useState<'all' | Recipe['category']>('all')
  const [search, setSearch] = useState('')

  function handleAddRecipe(recipe: Recipe) {
    onAddRecipe(recipe)
    setIsModalOpen(false)
  }

  const visibleRecipes = recipes.filter((recipe) => {
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter
    const matchesSearch = recipe.title.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-40">
        <div className="flex flex-wrap items-center justify-between gap-15">
          <div className="flex flex-wrap gap-10">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={
                categoryFilter === 'all'
                  ? 'main-btn font-title font-bold bg-main-blue text-white px-15 py-10'
                  : 'main-btn font-title font-bold px-15 py-10'
              }
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoryFilter(c.value)}
                className={
                  categoryFilter === c.value
                    ? `main-btn font-title font-bold text-black px-15 py-10 ${c.color}`
                    : 'main-btn font-title font-bold px-15 py-10'
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search recipes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-3 border-black px-15 py-10 font-title w-full sm:w-auto"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-20">
          {visibleRecipes.map((recipe) => {
            const categoryColor = CATEGORIES.find((c) => c.value === recipe.category)?.color ?? 'bg-neutral-200'
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onOpenRecipe(recipe.id)}
                className="main-btn flex flex-col p-0 min-h-100 overflow-hidden"
              >
                <span className={`h-10 w-full ${categoryColor}`} />
                <span className="flex-1 flex items-center justify-center p-20 text-center font-title font-bold uppercase">
                  {recipe.title}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="main-btn flex items-center justify-center p-20 min-h-100 text-4xl font-title font-bold"
          >
            +
          </button>
        </div>

        {isModalOpen && (
          <AddRecipeModal
            ingredientCatalog={ingredientCatalog}
            onAddIngredientDef={onAddIngredientDef}
            onEditIngredientDef={onEditIngredientDef}
            onDeleteIngredientDef={onDeleteIngredientDef}
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddRecipe}
          />
        )}
      </div>
    </div>
  )
}

export default Recipes
