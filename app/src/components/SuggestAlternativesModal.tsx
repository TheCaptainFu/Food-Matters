import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { recipeMacros } from '../nutrition'

type SuggestAlternativesModalProps = {
  current: Recipe
  alternatives: Recipe[]
  // Every recipe you could pick instead — for "Browse all recipes" when
  // none of the closest-match suggestions appeal.
  allRecipes: Recipe[]
  // Opens the new-recipe form; the saved recipe takes this meal's place.
  onCreateNew: () => void
  ingredientCatalog: IngredientDef[]
  onSelect: (recipeId: string) => void
  onClose: () => void
}

function MacroLine({ recipe, ingredientCatalog }: { recipe: Recipe; ingredientCatalog: IngredientDef[] }) {
  const macros = recipeMacros(recipe, ingredientCatalog)
  return (
    <span className="text-12 font-title text-neutral-500">
      {Math.round(macros.calories)} kcal · P {Math.round(macros.protein)}g · C {Math.round(macros.carbs)}g · F{' '}
      {Math.round(macros.fat)}g
    </span>
  )
}

function SuggestAlternativesModal({
  current,
  alternatives,
  allRecipes,
  ingredientCatalog,
  onSelect,
  onCreateNew,
  onClose,
}: SuggestAlternativesModalProps) {
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const browseList = allRecipes
    .filter((r) => r.id !== current.id && r.title.toLowerCase().includes(query))
    .sort((a, b) => a.title.localeCompare(b.title))

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[420px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-10">
          <h2 className="text-20 font-title font-bold uppercase">{isBrowsing ? 'All Recipes' : 'Swap Recipe'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-black hover:text-main-red font-bold text-20 leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {isBrowsing ? (
          /* Browse view: only the search and the full list, so it's not
             competing with the suggestions above it. */
          <>
            <input
              type="search"
              placeholder="Search your recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
              autoFocus
            />
            <div className="border-3 border-black max-h-[260px] overflow-y-auto">
              {browseList.length > 0 ? (
                browseList.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className="w-full flex flex-col gap-5 text-left px-10 py-10 hover:bg-main-yellow border-b-2 border-black last:border-b-0 cursor-pointer"
                  >
                    <span className="text-14 font-title font-bold">{r.title}</span>
                    <MacroLine recipe={r} ingredientCatalog={ingredientCatalog} />
                  </button>
                ))
              ) : (
                <p className="px-10 py-10 text-14 font-title text-neutral-500">No recipes match “{search.trim()}”.</p>
              )}
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="self-start text-14 font-title font-bold underline cursor-pointer"
            >
              Can't find it? + Create new recipe
            </button>
            <div className="flex justify-between gap-10">
              <button
                type="button"
                onClick={() => {
                  setIsBrowsing(false)
                  setSearch('')
                }}
                className="main-btn font-title font-bold px-15 py-10"
              >
                ← Back
              </button>
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase text-neutral-500">Currently</span>
              <div className="border-2 border-black px-10 py-10 flex flex-col gap-5 bg-neutral-50">
                <span className="text-14 font-title font-bold">{current.title}</span>
                <MacroLine recipe={current} ingredientCatalog={ingredientCatalog} />
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase text-neutral-500">Try instead</span>
              <div className="flex flex-col gap-10">
                {alternatives.length === 0 && (
                  <p className="text-14 font-title text-neutral-500">No alternatives in this category.</p>
                )}
                {alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => onSelect(alt.id)}
                    className="main-btn text-left px-10 py-10 flex flex-col gap-5 hover:bg-main-yellow"
                  >
                    <span className="text-14 font-title font-bold">{alt.title}</span>
                    <MacroLine recipe={alt} ingredientCatalog={ingredientCatalog} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase text-neutral-500">Not what you want?</span>
              <div className="grid grid-cols-2 gap-10">
                <button
                  type="button"
                  onClick={() => setIsBrowsing(true)}
                  className="border-2 border-dashed border-neutral-400 hover:border-black px-10 py-10 text-14 font-title font-bold cursor-pointer"
                >
                  🔍 Browse all recipes
                </button>
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="border-2 border-dashed border-neutral-400 hover:border-black px-10 py-10 text-14 font-title font-bold cursor-pointer"
                >
                  + Create new recipe
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default SuggestAlternativesModal
