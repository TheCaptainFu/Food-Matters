import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { CATEGORIES } from '../types'
import { recipeMacros, spoonHint } from '../nutrition'
import { isRecipeFasting } from '../dietaryRestrictions'
import { findDef, formatQuantity } from '../quantities'

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
  const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
  // Scale the amounts for however many you're cooking for.
  const [servings, setServings] = useState(baseServings)
  const scale = servings / baseServings

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-20 w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-20 font-title font-bold uppercase">{recipe.title}</h2>

        <div className="flex flex-wrap gap-10">
          {category && (
            <span
              className={`main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase text-black ${category.color}`}
            >
              {category.label}
            </span>
          )}
          {isRecipeFasting(recipe) && (
            <span className="main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase bg-white">
              ✝ Νηστίσιμο
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-10">
          <span className="text-14 font-title font-bold uppercase">Μερίδες</span>
          <span className="flex items-center border-3 border-black">
            <button
              type="button"
              onClick={() => setServings((n) => Math.max(1, n - 1))}
              aria-label="Λιγότερες μερίδες"
              className="w-30 h-30 font-bold cursor-pointer hover:bg-neutral-100"
            >
              −
            </button>
            <span className="min-w-30 text-center font-title font-bold">{servings}</span>
            <button
              type="button"
              onClick={() => setServings((n) => Math.min(20, n + 1))}
              aria-label="Περισσότερες μερίδες"
              className="w-30 h-30 font-bold cursor-pointer hover:bg-neutral-100"
            >
              +
            </button>
          </span>
        </div>

        <div className="flex flex-col gap-15">
          {recipe.ingredients.map((ing, i) => {
            const amount = ing.amount * scale
            return (
            <div
              key={i}
              className="flex items-center justify-between gap-5 bg-white border-2 border-black font-bold px-10 py-5"
            >
              <span className="text-14 text-black font-title">{ing.name}</span>
              <span className="text-14 text-black font-title text-right">
                {formatQuantity(amount, ing.unit, findDef(ing.name, ingredientCatalog))}
                {ing.unit === 'g' && spoonHint(amount) && (
                  <span className="block text-12 text-neutral-500 font-normal normal-case">{spoonHint(amount)}</span>
                )}
              </span>
            </div>
            )
          })}
        </div>

        {recipe.instructions && (
          <div className="flex flex-col gap-10">
            <span className="text-16 font-title font-bold uppercase">Εκτέλεση</span>
            <p className="text-14 font-title whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
          </div>
        )}

        <div className="main-btn p-15 flex flex-col gap-5">
          <span className="text-14 font-title font-bold uppercase">
            {Math.round(macros.calories)} kcal <span className="font-normal normal-case text-neutral-500">ανά μερίδα</span>
          </span>
          <span className="text-14 font-title text-neutral-500">
            Πρωτεΐνη {Math.round(macros.protein)}g · Υδατάνθρακες {Math.round(macros.carbs)}g · Λιπαρά{' '}
            {Math.round(macros.fat)}g
          </span>
        </div>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            Κλείσιμο
          </button>
          <button type="button" onClick={onEdit} className="main-btn font-title font-bold px-15 py-10">
            Επεξεργασία
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="main-btn font-title font-bold bg-main-red text-white px-15 py-10"
          >
            Διαγραφή
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RecipeDetailModal
