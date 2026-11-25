import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe } from '../types'
import { CATEGORIES, DIFFICULTIES, SLOT_KEYS } from '../types'
import { recipeMacros, spoonHint } from '../nutrition'
import { recipeInfo, formatEuro, formatMinutes } from '../recipeTraits'
import { findDef, formatQuantity } from '../quantities'
import CrossIcon from './CrossIcon'
import HeartIcon from './HeartIcon'
import { loadHousehold } from '../shopping'

type RecipeDetailModalProps = {
  recipe: Recipe
  ingredientCatalog: IngredientDef[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}

function RecipeDetailModal({ recipe, ingredientCatalog, onClose, onEdit, onDelete, onToggleFavorite }: RecipeDetailModalProps) {
  const category = CATEGORIES.find((c) => c.value === recipe.category)
  const macros = recipeMacros(recipe, ingredientCatalog)
  const info = recipeInfo(recipe, ingredientCatalog)
  const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
  // Scale the amounts for however many you're cooking for — starting from
  // the household size set on the shopping list.
  const [servings, setServings] = useState(loadHousehold)
  const scale = servings / baseServings
  // Ready food (a φρέντο, a σουβλάκι) has no ingredients to scale or cook:
  // just what it is and its calories.
  const ready = recipe.ingredients.length === 0

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-20 w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-10">
          <h2 className="text-20 font-title font-bold uppercase">{recipe.title}</h2>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={!!recipe.favorite}
            aria-label={recipe.favorite ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
            title={recipe.favorite ? 'Αφαίρεση από τα αγαπημένα' : 'Στα αγαπημένα'}
            className="main-btn shrink-0 w-[38px] h-[38px] p-0 flex items-center justify-center bg-white"
          >
            <HeartIcon on={!!recipe.favorite} size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-10">
          {category && (
            <span
              className={`main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase text-black ${category.color}`}
            >
              {category.label}
            </span>
          )}
          {info.fasting && (
            <span className="main-btn inline-flex items-center gap-5 self-start px-10 py-5 text-14 font-title font-bold uppercase bg-white">
              <CrossIcon size={13} /> Νηστίσιμο
            </span>
          )}
        </div>

        {!ready && (
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
        )}

        {/* At a glance: time, effort, cost, how long it keeps, season, meals */}
        <div className="grid grid-cols-2 gap-10 font-title">
          {(
            (ready ? [] : [
              ['⏱ Χρόνος', formatMinutes(info.minutes)],
              ['📊 Δυσκολία', DIFFICULTIES.find((d) => d.value === info.difficulty)?.label ?? ''],
              [
                '💶 Κόστος',
                servings > 1
                  ? `~${formatEuro(info.cost * servings)} για ${servings}`
                  : `~${formatEuro(info.cost)} τη μερίδα`,
              ],
              ['🧊 Στο ψυγείο', info.keepsDays === 1 ? 'Τρώγεται φρέσκο' : `Κρατάει ${info.keepsDays} μέρες`],
              ...(info.season
                ? ([['🗓 Εποχή', info.season === 'summer' ? 'Καλοκαιρινό' : 'Χειμωνιάτικο']] as const)
                : []),
            ]).concat([
              [
                '🍽 Γεύματα',
                (recipe.mealTypes ?? [])
                  .map((m) => SLOT_KEYS.find((s) => s.value === m)?.label)
                  .filter(Boolean)
                  .join(', '),
              ],
            ]) as (readonly [string, string])[]
          ).map(([label, value]) => (
            <div key={label} className="border-2 border-black px-10 py-5 flex flex-col">
              <span className="text-12 text-neutral-500">{label}</span>
              <span className="text-14 font-bold">{value}</span>
            </div>
          ))}
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

        <div className="grid grid-cols-3 gap-10">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold text-14 px-5 py-10">
            Κλείσιμο
          </button>
          <button type="button" onClick={onEdit} className="main-btn font-title font-bold text-14 px-5 py-10">
            Επεξεργασία
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="main-btn font-title font-bold text-14 bg-main-red text-white px-5 py-10"
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
