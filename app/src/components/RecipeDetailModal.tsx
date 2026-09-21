import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { UNITS, CATEGORIES } from '../types'
import { recipeMacros } from '../nutrition'

type RecipeDetailModalProps = {
  recipe: Recipe
  ingredientCatalog: IngredientDef[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function RecipeDetailModal({ recipe, ingredientCatalog, onClose, onEdit, onDelete }: RecipeDetailModalProps) {
  const category = CATEGORIES.find((c) => c.value === recipe.category)
  const macros = recipeMacros(recipe, ingredientCatalog)

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-30 flex flex-col gap-20 w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-20 font-title font-bold uppercase">{recipe.title}</h2>

        {category && (
          <span
            className={`main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase text-black ${category.color}`}
          >
            {category.label}
          </span>
        )}

        <div className="flex flex-col gap-15">
          {recipe.ingredients.map((ing, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-5 bg-white border-2 border-black font-bold px-10 py-5"
            >
              <span className="text-14 text-black font-title">{ing.name}</span>
              <span className="text-14 text-black font-title">
                {ing.amount} {UNITS.find((u) => u.value === ing.unit)?.label ?? ing.unit}
              </span>
            </div>
          ))}
        </div>

        {recipe.instructions && (
          <div className="flex flex-col gap-10">
            <span className="text-16 font-title font-bold uppercase">How to make it</span>
            <p className="text-14 font-title whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
          </div>
        )}

        <div className="main-btn p-15 flex flex-col gap-5">
          <span className="text-14 font-title font-bold uppercase">
            {Math.round(macros.calories)} kcal
          </span>
          <span className="text-14 font-title text-neutral-500">
            Protein {Math.round(macros.protein)}g · Carbs {Math.round(macros.carbs)}g · Fat{' '}
            {Math.round(macros.fat)}g
          </span>
        </div>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            Cancel
          </button>
          <button type="button" onClick={onEdit} className="main-btn font-title font-bold px-15 py-10">
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="main-btn font-title font-bold bg-main-red text-white px-15 py-10"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RecipeDetailModal
