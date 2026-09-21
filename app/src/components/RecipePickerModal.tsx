import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Recipe } from '../types'

type RecipePickerModalProps = {
  recipes: Recipe[]
  onSave: (recipeIds: string[]) => void
  onClose: () => void
}

function RecipePickerModal({ recipes, onSave, onClose }: RecipePickerModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase()))

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
        className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-md"
      >
        <h2 className="text-20 font-title font-bold uppercase">Choose Recipes</h2>

        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-3 border-black px-15 py-10 font-title"
          autoFocus
        />

        <div className="border-3 border-black max-h-[300px] overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-15 text-14 font-title text-neutral-500 text-center">No matches.</p>
          )}
          {filtered.map((recipe, index) => {
            const isChecked = selectedIds.has(recipe.id)
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => toggle(recipe.id)}
                className={
                  index < filtered.length - 1
                    ? `flex items-center gap-10 w-full text-left px-15 py-10 text-14 font-title font-bold border-b-2 border-black ${isChecked ? 'bg-main-yellow' : 'hover:bg-neutral-100'}`
                    : `flex items-center gap-10 w-full text-left px-15 py-10 text-14 font-title font-bold ${isChecked ? 'bg-main-yellow' : 'hover:bg-neutral-100'}`
                }
              >
                <span
                  className={
                    isChecked
                      ? 'shrink-0 w-20 h-20 border-2 border-black bg-main-blue flex items-center justify-center text-white text-14 font-bold'
                      : 'shrink-0 w-20 h-20 border-2 border-black bg-white'
                  }
                >
                  {isChecked ? '✓' : ''}
                </span>
                {recipe.title}
              </button>
            )
          })}
        </div>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
          >
            Save{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RecipePickerModal
