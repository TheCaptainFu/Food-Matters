import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { recipeMacros } from '../nutrition'
import { matchesSearch } from '../text'
import FoodRow from './FoodRow'

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
      {Math.round(macros.calories)} kcal · Π {Math.round(macros.protein)}g · Υ {Math.round(macros.carbs)}g · Λ{' '}
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
    .filter((r) => r.id !== current.id && matchesSearch(r.title, query))
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.title.localeCompare(b.title, 'el'))

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
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[420px] tab:max-w-[600px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-10">
          <h2 className="text-20 font-title font-bold uppercase">{isBrowsing ? 'Όλα τα φαγητά' : 'Αλλαγή φαγητού'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
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
              placeholder="Αναζήτηση φαγητών…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
              autoFocus
            />
            <div className="border-3 border-black overflow-hidden">
            <div className="max-h-[260px] tab:max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
                {browseList.length > 0 ? (
                  browseList.map((r) => (
                    <FoodRow key={r.id} recipe={r} ingredientCatalog={ingredientCatalog} onClick={() => onSelect(r.id)} />
                  ))
                ) : (
                  <p className="px-10 py-10 text-14 font-title text-neutral-500">Δεν βρέθηκε τίποτα για «{search.trim()}».</p>
                )}
              </div>
          </div>
            <div className="flex flex-wrap items-center gap-10">
              <button
                type="button"
                onClick={() => {
                  setIsBrowsing(false)
                  setSearch('')
                }}
                className="main-btn font-title font-bold px-15 py-10"
              >
                ← Πίσω
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                className="main-btn font-title font-bold px-15 py-10 bg-main-yellow mr-auto"
              >
                + Νέο φαγητό
              </button>
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Άκυρο
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase text-neutral-500">Τώρα</span>
              <div className="border-2 border-black px-10 py-10 flex flex-col gap-5 bg-neutral-50">
                <span className="text-14 font-title font-bold">{current.title}</span>
                <MacroLine recipe={current} ingredientCatalog={ingredientCatalog} />
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <span className="text-12 font-title font-bold uppercase text-neutral-500">Δοκίμασε αντί γι’ αυτό</span>
              <div className="flex flex-col gap-10">
                {alternatives.length === 0 && (
                  <p className="text-14 font-title text-neutral-500">Δεν υπάρχουν εναλλακτικές για αυτό το γεύμα.</p>
                )}
                {alternatives.map((alt) => (
                  <FoodRow
                    key={alt.id}
                    recipe={alt}
                    ingredientCatalog={ingredientCatalog}
                    framed
                    onClick={() => onSelect(alt.id)}
                  />
                ))}
              </div>
            </div>

            {/* None appeal: browse everything or add a new one — bottom left, like the other dialogs. */}
            <div className="flex flex-wrap items-center gap-10">
              <button
                type="button"
                onClick={() => setIsBrowsing(true)}
                className="main-btn font-title font-bold px-15 py-10"
              >
                🔍 Όλα τα φαγητά
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                className="main-btn font-title font-bold px-15 py-10 bg-main-yellow mr-auto"
              >
                + Νέο φαγητό
              </button>
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Άκυρο
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
