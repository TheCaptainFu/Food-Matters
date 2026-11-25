import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import FoodRow from './FoodRow'
import { matchesSearch } from '../text'

type RecipePickerModalProps = {
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  onSave: (recipeIds: string[]) => void
  onClose: () => void
}

function RecipePickerModal({ recipes, ingredientCatalog, onSave, onClose }: RecipePickerModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = recipes
    .filter((r) => matchesSearch(r.title, search))
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite))

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    if (selectedIds.size === 0) return
    onSave([...selectedIds])
  }

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
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-md tab:max-w-[600px]"
      >
        <h2 className="text-20 font-title font-bold uppercase">Επιλογή φαγητών</h2>

        <input
          type="text"
          placeholder="Αναζήτηση…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-3 border-black px-15 py-10 font-title"
          autoFocus
        />

        <div className="border-3 border-black overflow-hidden">
          <div className="max-h-[50vh] tab:max-h-[60vh] overflow-y-auto [scrollbar-width:thin]">
            {filtered.length === 0 && (
              <p className="p-15 text-14 font-title text-neutral-500 text-center">Δεν βρέθηκε τίποτα.</p>
            )}
            {filtered.map((recipe) => (
              <FoodRow
                key={recipe.id}
                recipe={recipe}
                ingredientCatalog={ingredientCatalog}
                selected={selectedIds.has(recipe.id)}
                onClick={() => toggle(recipe.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            Άκυρο
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
          >
            Αποθήκευση{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RecipePickerModal
