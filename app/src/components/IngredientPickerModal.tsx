import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroceryCategory, IngredientDef } from '../types'
import { GROCERY_CATEGORIES } from '../types'
import { matchesSearch } from '../text'

type IngredientPickerModalProps = {
  catalog: IngredientDef[]
  onSelect: (name: string) => void
  onAddNew: (def: IngredientDef) => void
  onClose: () => void
}

// Picking only — plus adding an ingredient that's missing. Editing or
// deleting catalog entries is deliberately not offered here, so choosing an
// ingredient for a recipe can't accidentally change it for every recipe.

function IngredientPickerModal({
  catalog,
  onSelect,
  onAddNew,
  onClose,
}: IngredientPickerModalProps) {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCalories, setFormCalories] = useState('')
  const [formProtein, setFormProtein] = useState('')
  const [formCarbs, setFormCarbs] = useState('')
  const [formFat, setFormFat] = useState('')
  const [formCategory, setFormCategory] = useState<GroceryCategory>('other')

  const filtered = catalog.filter((c) => matchesSearch(c.name, search))

  function openAddNew() {
    setFormName(search.trim())
    setFormCalories('')
    setFormProtein('')
    setFormCarbs('')
    setFormFat('')
    setFormCategory('other')
    setIsFormOpen(true)
  }

  function handleFormSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) return

    const def: IngredientDef = {
      name: trimmedName,
      category: formCategory,
      caloriesPer100g: Number(formCalories) || 0,
      proteinPer100g: Number(formProtein) || 0,
      carbsPer100g: Number(formCarbs) || 0,
      fatPer100g: Number(formFat) || 0,
    }

    const existing = catalog.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
    if (existing) {
      onSelect(existing.name)
      return
    }

    onAddNew(def)
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
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[400px]"
      >
        {isFormOpen ? (
          <>
            <h2 className="text-20 font-title font-bold uppercase">Νέο υλικό</h2>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Όνομα</span>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-3 border-black px-10 py-5 font-title"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Διάδρομος</span>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as GroceryCategory)}
                className="bg-white border-3 border-black px-10 py-5 text-14 font-title"
              >
                {GROCERY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Θερμίδες ανά 100g</span>
              <input
                type="number"
                min="0"
                value={formCalories}
                onChange={(e) => setFormCalories(e.target.value)}
                className="border-3 border-black px-10 py-5 font-title"
              />
            </label>

            <div className="grid grid-cols-3 gap-10">
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Πρωτεΐνη (g)</span>
                <input
                  type="number"
                  min="0"
                  value={formProtein}
                  onChange={(e) => setFormProtein(e.target.value)}
                  className="border-3 border-black px-10 py-5 font-title w-full"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Υδατάνθρακες (g)</span>
                <input
                  type="number"
                  min="0"
                  value={formCarbs}
                  onChange={(e) => setFormCarbs(e.target.value)}
                  className="border-3 border-black px-10 py-5 font-title w-full"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Λιπαρά (g)</span>
                <input
                  type="number"
                  min="0"
                  value={formFat}
                  onChange={(e) => setFormFat(e.target.value)}
                  className="border-3 border-black px-10 py-5 font-title w-full"
                />
              </label>
            </div>

            <div className="flex gap-10 justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="main-btn font-title font-bold px-15 py-10 mr-auto"
              >
                ← Πίσω
              </button>
              <button
                type="button"
                onClick={handleFormSave}
                className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10"
              >
                Προσθήκη
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-20 font-title font-bold uppercase">Επίλεξε υλικό</h2>

            <input
              type="text"
              placeholder="Αναζήτηση…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-3 border-black px-15 py-10 font-title"
              autoFocus
            />

            <div className="border-3 border-black max-h-[300px] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="p-15 text-14 font-title text-neutral-500 text-center">Δεν βρέθηκε τίποτα.</p>
              )}
              {filtered.map((c, index) => (
                <div
                  key={c.name}
                  className={
                    index < filtered.length - 1
                      ? 'flex items-stretch border-b-2 border-black'
                      : 'flex items-stretch'
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.name)}
                    className="flex-1 text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow"
                  >
                    {c.name}
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={openAddNew} className="main-btn font-title font-bold px-15 py-10 w-full">
              + Νέο υλικό
            </button>

            <div className="flex">
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                ← Πίσω
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default IngredientPickerModal
