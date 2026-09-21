import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef } from '../types'

type IngredientPickerModalProps = {
  catalog: IngredientDef[]
  onSelect: (name: string) => void
  onAddNew: (def: IngredientDef) => void
  onEditDef: (oldName: string, def: IngredientDef) => void
  onDeleteDef: (name: string) => void
  onClose: () => void
}

function IngredientPickerModal({
  catalog,
  onSelect,
  onAddNew,
  onEditDef,
  onDeleteDef,
  onClose,
}: IngredientPickerModalProps) {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCalories, setFormCalories] = useState('')
  const [formProtein, setFormProtein] = useState('')
  const [formCarbs, setFormCarbs] = useState('')
  const [formFat, setFormFat] = useState('')

  const filtered = catalog.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  function openAddNew() {
    setEditingOriginalName(null)
    setFormName(search.trim())
    setFormCalories('')
    setFormProtein('')
    setFormCarbs('')
    setFormFat('')
    setIsFormOpen(true)
  }

  function openEdit(def: IngredientDef) {
    setEditingOriginalName(def.name)
    setFormName(def.name)
    setFormCalories(String(def.caloriesPer100g))
    setFormProtein(String(def.proteinPer100g))
    setFormCarbs(String(def.carbsPer100g))
    setFormFat(String(def.fatPer100g))
    setIsFormOpen(true)
  }

  function handleDelete(name: string) {
    if (window.confirm(`Delete "${name}" from your ingredient catalog?`)) {
      onDeleteDef(name)
    }
  }

  function handleFormSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) return

    const def: IngredientDef = {
      name: trimmedName,
      caloriesPer100g: Number(formCalories) || 0,
      proteinPer100g: Number(formProtein) || 0,
      carbsPer100g: Number(formCarbs) || 0,
      fatPer100g: Number(formFat) || 0,
    }

    if (editingOriginalName) {
      onEditDef(editingOriginalName, def)
      setIsFormOpen(false)
      return
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
        className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[400px]"
      >
        {isFormOpen ? (
          <>
            <div className="flex items-center justify-between gap-10">
              <h2 className="text-20 font-title font-bold uppercase">
                {editingOriginalName ? 'Edit Ingredient' : 'New Ingredient'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Back"
                className="main-btn font-title font-bold px-10 py-5"
              >
                ← Back
              </button>
            </div>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Name</span>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-3 border-black px-10 py-5 font-title"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Calories per 100g</span>
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
                <span className="text-14 font-title font-bold">Protein (g)</span>
                <input
                  type="number"
                  min="0"
                  value={formProtein}
                  onChange={(e) => setFormProtein(e.target.value)}
                  className="border-3 border-black px-10 py-5 font-title w-full"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Carbs (g)</span>
                <input
                  type="number"
                  min="0"
                  value={formCarbs}
                  onChange={(e) => setFormCarbs(e.target.value)}
                  className="border-3 border-black px-10 py-5 font-title w-full"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Fat (g)</span>
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
                className="main-btn font-title font-bold px-15 py-10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSave}
                className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10"
              >
                {editingOriginalName ? 'Save' : 'Add'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-20 font-title font-bold uppercase">Choose Ingredient</h2>

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
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Edit ${c.name}`}
                    className="px-10 text-14 font-title font-bold border-l-2 border-black hover:bg-main-yellow"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.name)}
                    aria-label={`Delete ${c.name}`}
                    className="px-10 text-14 font-title font-bold border-l-2 border-black hover:bg-main-red"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={openAddNew} className="main-btn font-title font-bold px-15 py-10 w-full">
              + Add new ingredient
            </button>

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

export default IngredientPickerModal
