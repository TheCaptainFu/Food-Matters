import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { recipeMacros } from '../nutrition'

type SuggestAlternativesModalProps = {
  current: Recipe
  alternatives: Recipe[]
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
  ingredientCatalog,
  onSelect,
  onClose,
}: SuggestAlternativesModalProps) {
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
        <div className="flex items-center justify-between gap-10">
          <h2 className="text-20 font-title font-bold uppercase">Swap Recipe</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-black hover:text-main-red font-bold text-20 leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

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

        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default SuggestAlternativesModal
