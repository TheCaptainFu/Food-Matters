import { useState } from 'react'
import type { Recipe, IngredientDef } from '../types'
import { CATEGORIES } from '../types'

type LeftoversProps = {
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  onOpenRecipe: (id: string) => void
}

function Leftovers({ recipes, ingredientCatalog, onOpenRecipe }: LeftoversProps) {
  const [have, setHave] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const visibleIngredients = ingredientCatalog.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  function toggle(name: string) {
    setHave((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const withMissing = recipes.map((recipe) => ({
    recipe,
    missing: recipe.ingredients.filter((ing) => !have.has(ing.name)),
  }))

  const canMake = withMissing.filter((r) => r.missing.length === 0)
  const almost = withMissing
    .filter((r) => r.missing.length > 0 && r.missing.length <= 2)
    .sort((a, b) => a.missing.length - b.missing.length)

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div className="flex flex-col gap-15">
          <h2 className="text-26 font-title font-bold uppercase">What's in your fridge?</h2>
          <p className="text-14 font-title text-neutral-500">
            Pick what you have on hand, and we'll show you what you can cook.
          </p>

          <input
            type="text"
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-3 border-black px-15 py-10 font-title max-w-[300px]"
          />

          <div className="relative">
            <div className="flex flex-wrap gap-10 max-h-[230px] overflow-hidden">
              {visibleIngredients.length === 0 && (
                <p className="text-14 font-title text-neutral-500">No matching ingredients.</p>
              )}
              {visibleIngredients.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggle(c.name)}
                  className={
                    have.has(c.name)
                      ? 'main-btn font-title font-bold px-15 py-10 bg-main-yellow'
                      : 'main-btn font-title font-bold px-15 py-10'
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
            {visibleIngredients.length > 20 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-linear-to-t from-white to-transparent" />
            )}
          </div>
          {visibleIngredients.length > 20 && (
            <p className="text-12 font-title text-neutral-500">
              Showing {visibleIngredients.length} ingredients — search to narrow it down.
            </p>
          )}
        </div>

        {have.size === 0 ? (
          <p className="main-btn p-20 text-16 font-title font-bold text-center">
            Select the ingredients you have to see what you can cook.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">You can make ({canMake.length})</h3>
              {canMake.length === 0 ? (
                <p className="text-14 font-title text-neutral-500">
                  Nothing yet with just those — try selecting a few more ingredients.
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
                        <span className="p-15 font-title font-bold uppercase block">{recipe.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">Missing just a few</h3>
              {almost.length === 0 ? (
                <p className="text-14 font-title text-neutral-500">No close matches.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                  {almost.map(({ recipe, missing }) => (
                    <div key={recipe.id} className="main-btn p-15 flex flex-col gap-10">
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(recipe.id)}
                        className="font-title font-bold uppercase text-left"
                      >
                        {recipe.title}
                      </button>
                      <span className="text-14 font-title text-neutral-500">
                        Missing: {missing.map((m) => m.name).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Leftovers
