import type { IngredientDef, Recipe } from '../types'
import { CATEGORIES } from '../types'
import { recipeMacros } from '../nutrition'
import HeartIcon from './HeartIcon'

// "teaser_2" (as the user calls it): one food as a compact row for the
// dialogs where you pick a food quickly. The kind's colour on top, name and
// calories on the first line, protein / carbs / fat below.

type FoodRowProps = {
  recipe: Recipe
  ingredientCatalog: IngredientDef[]
  onClick: () => void
  // Multi-select lists show a tick box.
  selected?: boolean
  // Rows inside a bordered list get a divider; standalone rows a frame.
  framed?: boolean
}

function FoodRow({ recipe, ingredientCatalog, onClick, selected, framed = false }: FoodRowProps) {
  const category = CATEGORIES.find((c) => c.value === recipe.category)
  const info = { macros: recipeMacros(recipe, ingredientCatalog) }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected === undefined ? undefined : selected}
      className={`w-full flex flex-col text-left cursor-pointer ${
        selected ? 'bg-main-yellow' : 'bg-white hover:bg-main-yellow/40'
      } ${framed ? 'main-btn p-0 overflow-hidden' : 'border-b-2 border-black last:border-b-0'}`}
    >
      {/* The kind's colour on top, like the cards on the Φαγητά page. */}
      <span className={`h-[6px] w-full shrink-0 ${category?.color ?? 'bg-neutral-200'}`} aria-hidden="true" />
      <span className="flex items-start gap-10 px-10 pt-5 pb-10">
        {selected !== undefined && (
          <span
            aria-hidden="true"
            className={`shrink-0 mt-[2px] w-20 h-20 border-2 border-black flex items-center justify-center text-14 font-bold ${
              selected ? 'bg-main-blue text-white' : 'bg-white'
            }`}
          >
            {selected ? '✓' : ''}
          </span>
        )}
        <span className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Name left, calories right */}
          <span className="flex items-start justify-between gap-10">
            <span className="text-16 font-title font-bold leading-snug">
              {recipe.favorite && (
                <span className="inline-block align-[-2px] mr-5">
                  <HeartIcon on size={14} />
                </span>
              )}
              {recipe.title}
            </span>
            <span className="shrink-0 px-5 py-[1px] bg-main-blue text-white text-12 font-title font-bold whitespace-nowrap">
              {Math.round(info.macros.calories)} kcal
            </span>
          </span>
          {/* Underneath: protein, carbs, fat (the kind is the colour on top). */}
          <span className="flex items-center gap-10 text-12 font-title text-black">
            <span className="flex flex-wrap gap-x-10 font-bold">
              <span className="whitespace-nowrap">Π {Math.round(info.macros.protein)}g</span>
              <span className="whitespace-nowrap">Υ {Math.round(info.macros.carbs)}g</span>
              <span className="whitespace-nowrap">Λ {Math.round(info.macros.fat)}g</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

export default FoodRow
