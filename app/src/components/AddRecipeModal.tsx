import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Recipe, Ingredient, Unit, Category, IngredientDef, SlotKey } from '../types'
import { UNITS, CATEGORIES, SLOT_KEYS } from '../types'
import { spoonHint } from '../nutrition'
import IngredientPickerModal from './IngredientPickerModal'

// Same colours as each meal's badge on the Calendar. Literal class strings
// (not interpolated) so the Tailwind build picks them up.
const MEAL_CHIP_ON: Record<SlotKey, string> = {
  breakfast: 'bg-main-yellow text-black',
  lunch: 'bg-main-orange text-black',
  afternoon: 'bg-main-teal text-black',
  dinner: 'bg-main-blue text-white',
}

type AddRecipeModalProps = {
  initialRecipe?: Recipe
  ingredientCatalog: IngredientDef[]
  onAddIngredientDef: (def: IngredientDef) => void
  onClose: () => void
  // Shown as "← Back" when the form was opened from another dialog
  // (e.g. Swap Recipe), to return there instead of closing everything.
  onBack?: () => void
  onSave: (recipe: Recipe) => void
}

function AddRecipeModal({
  initialRecipe,
  ingredientCatalog,
  onAddIngredientDef,
  onClose,
  onBack,
  onSave,
}: AddRecipeModalProps) {
  const [title, setTitle] = useState(initialRecipe?.title ?? '')
  const [category, setCategory] = useState<Category>(initialRecipe?.category ?? CATEGORIES[0].value)
  const [mealTypes, setMealTypes] = useState<SlotKey[]>(initialRecipe?.mealTypes ?? [])
  const [instructions, setInstructions] = useState(initialRecipe?.instructions ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialRecipe?.ingredients ?? [])
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  function toggleMealType(slot: SlotKey) {
    setMealTypes((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]))
  }

  function updateIngredient(index: number, field: 'amount' | 'unit', value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index ? { ...ing, [field]: field === 'amount' ? Number(value) : value } : ing,
      ),
    )
  }

  function addIngredient(name: string) {
    setIngredients((prev) =>
      prev.some((ing) => ing.name === name) ? prev : [...prev, { name, amount: 0, unit: 'g' as Unit }],
    )
    setIsPickerOpen(false)
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cleanIngredients = ingredients.filter((ing) => ing.name.trim() !== '')
    if (!title.trim() || cleanIngredients.length === 0 || mealTypes.length === 0) return

    onSave({
      id: initialRecipe?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category,
      mealTypes,
      ingredients: cleanIngredients,
      instructions: instructions.trim() || undefined,
    })
  }

  return createPortal(
    <>
      {!isPickerOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
          onClick={onClose}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="border-3 border-black bg-white shadow-[4px_4px_0_0_#000] p-20 sm:p-30 flex flex-col gap-25 w-full max-w-[680px] max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-20 font-title font-bold uppercase">
              {initialRecipe ? 'Edit Recipe' : 'New Recipe'}
            </h2>

            {/* Name and type side by side on wider screens */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-15">
              <label className="flex flex-col gap-10">
                <span className="text-16 font-title font-bold uppercase">Name</span>
                <input
                  type="text"
                  placeholder="e.g. Chicken souvlaki"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-3 border-black px-15 py-10 font-title"
                  autoFocus
                  required
                />
              </label>

              <label className="flex flex-col gap-10">
                <span className="text-16 font-title font-bold uppercase">Type</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="bg-white border-3 border-black pl-15 pr-30 py-10 font-title"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-10">
              <span className="text-16 font-title font-bold uppercase">When is this eaten?</span>
              {/* Toggle chips in each meal's Calendar colour, so a recipe's
                  meals look the same here as on the plan. 2×2 on wider screens. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {SLOT_KEYS.map((slot) => {
                  const isOn = mealTypes.includes(slot.value)
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      role="checkbox"
                      aria-checked={isOn}
                      onClick={() => toggleMealType(slot.value)}
                      className={
                        isOn
                          ? `main-btn w-full flex items-center gap-10 text-left font-title font-bold text-14 uppercase px-15 py-10 ${MEAL_CHIP_ON[slot.value]}`
                          : 'main-btn w-full flex items-center gap-10 text-left font-title font-bold text-14 uppercase px-15 py-10 text-neutral-500'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="w-20 h-20 shrink-0 border-2 border-current bg-white text-black flex items-center justify-center text-14 leading-none"
                      >
                        {isOn ? '✓' : ''}
                      </span>
                      {slot.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-14 font-title text-neutral-500">
                {mealTypes.length === 0
                  ? 'Pick at least one. Meal suggestions only offer it at these times.'
                  : 'Meal suggestions only offer it at these times.'}
              </p>
            </div>

            <div className="flex flex-col gap-10">
              <span className="text-16 font-title font-bold uppercase">Ingredients</span>

              {ingredients.map((ing, i) => {
                const hint = ing.unit === 'g' ? spoonHint(ing.amount) : null
                return (
                  <div key={i} className="flex flex-wrap gap-10">
                    <span className="flex-1 min-w-100 bg-white border-3 border-black px-10 py-5 font-title font-bold flex items-center truncate">
                      {ing.name}
                    </span>
                    <div className="flex flex-col gap-5">
                      <div className="flex gap-10">
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={ing.amount || ''}
                          onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                          className="border-3 border-black px-10 py-5 w-90 font-title"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                          className="bg-white border-3 border-black pl-10 pr-30 py-5 text-14 font-title"
                        >
                          {UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(i)}
                          className="main-btn px-10"
                          aria-label="Remove ingredient"
                        >
                          ✕
                        </button>
                      </div>
                      {hint && <span className="text-12 font-title text-neutral-500">{hint}</span>}
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="main-btn font-title font-bold self-start px-15 py-5"
              >
                + Ingredient
              </button>
            </div>

            <label className="flex flex-col gap-10">
              <span className="text-16 font-title font-bold uppercase">Instructions (optional)</span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How do you make it?"
                rows={5}
                className="border-3 border-black px-15 py-10 font-title resize-y"
              />
            </label>

            <div className="flex gap-10 justify-end">
              {onBack && (
                <button type="button" onClick={onBack} className="main-btn font-title font-bold px-15 py-10 mr-auto">
                  ← Back
                </button>
              )}
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mealTypes.length === 0}
                className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
              >
                {initialRecipe ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isPickerOpen && (
        <IngredientPickerModal
          catalog={ingredientCatalog}
          onSelect={addIngredient}
          onAddNew={(def) => {
            onAddIngredientDef(def)
            addIngredient(def.name)
          }}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </>,
    document.body,
  )
}

export default AddRecipeModal
