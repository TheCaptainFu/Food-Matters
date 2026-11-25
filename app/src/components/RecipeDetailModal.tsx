import { createPortal } from 'react-dom'
import type { IngredientDef, Recipe, SlotKey } from '../types'
import { CATEGORIES, DIFFICULTIES, SLOT_KEYS } from '../types'
import { recipeMacros, spoonHint } from '../nutrition'
import { recipeInfo, formatEuro, formatMinutes } from '../recipeTraits'
import { findDef, formatQuantity } from '../quantities'
import CrossIcon from './CrossIcon'
import { conditionConflicts, type HealthCondition } from '../healthConditions'
import HeartIcon from './HeartIcon'

// Same colours as each meal's badge on Σήμερα and Πρόγραμμα.
const MEAL_BADGE: Record<SlotKey, string> = {
  breakfast: 'bg-main-yellow text-black',
  lunch: 'bg-main-orange text-black',
  afternoon: 'bg-main-teal text-black',
  dinner: 'bg-main-blue text-white',
}

type RecipeDetailModalProps = {
  recipe: Recipe
  ingredientCatalog: IngredientDef[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  // Your health conditions: a food that doesn't suit them gets a warning.
  conditions?: HealthCondition[]
}

function RecipeDetailModal({ recipe, ingredientCatalog, onClose, onEdit, onDelete, onToggleFavorite, conditions = [] }: RecipeDetailModalProps) {
  const category = CATEGORIES.find((c) => c.value === recipe.category)
  const macros = recipeMacros(recipe, ingredientCatalog)
  const info = recipeInfo(recipe, ingredientCatalog)
  // The amounts are for the recipe's own portions; changing them is done
  // in Επεξεργασία.
  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
  // Ready food (a φρέντο, a σουβλάκι) has no ingredients to scale or cook:
  // just what it is and its calories.
  const ready = recipe.ingredients.length === 0
  const conflicts = conditionConflicts(recipe, conditions)

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-30 w-full max-w-md tab:max-w-[640px] max-h-[85vh] overflow-y-auto"
      >
        {/* Sections sit further apart than the lines inside them. */}
        <div className="flex flex-col gap-15">
        <div className="flex items-start justify-between gap-10">
          <h2 className="text-20 tab:text-24 font-title font-bold uppercase">{recipe.title}</h2>
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

        <div className="flex flex-wrap items-center gap-10">
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
          {/* The meals it suits, at the end of the label row. */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-5 font-title">
            {(recipe.mealTypes ?? []).map((m) => {
              const slot = SLOT_KEYS.find((s) => s.value === m)
              if (!slot) return null
              return (
                <span
                  key={m}
                  className={`px-5 py-[2px] text-12 font-bold uppercase border-2 border-black ${MEAL_BADGE[m]}`}
                >
                  {slot.label}
                </span>
              )
            })}
            {info.season && (
              <span className="px-5 py-[2px] text-12 font-bold uppercase border-2 border-black bg-white">
                {info.season === 'summer' ? 'Καλοκαιρινό' : 'Χειμωνιάτικο'}
              </span>
            )}
          </div>
        </div>


        {/* Doesn't suit one of your health conditions: say which, and why. */}
        {conflicts.length > 0 && (
          <div role="note" className="flex gap-10 border-2 border-black bg-main-red/15 px-10 py-10 font-title">
            <span
              aria-hidden="true"
              className="shrink-0 w-[22px] h-[22px] flex items-center justify-center bg-main-red text-white font-bold text-14 border-2 border-black"
            >
              !
            </span>
            <span className="flex flex-col gap-[2px] text-14 tab:text-16">
              <span className="font-bold">Δεν σου ταιριάζει</span>
              {conflicts.map((c) => (
                <span key={c.condition}>
                  {c.label}
                  {c.items.length > 0 && <span className="text-neutral-600"> · {c.items.join(', ')}</span>}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* At a glance: one box split in four (time, effort, cost, how long
            it keeps), then the meals it suits as their coloured badges. */}
        {!ready && (
          <div className="grid grid-cols-2 tab:grid-cols-4 gap-[2px] bg-black border-2 border-black font-title">
            {(
              [
                ['Χρόνος', formatMinutes(info.minutes)],
                ['Δυσκολία', DIFFICULTIES.find((d) => d.value === info.difficulty)?.label ?? ''],
                [
                  'Κόστος',
                  `~${formatEuro(info.cost)} / μερίδα`,
                ],
                ['Ψυγείο', info.keepsDays === 1 ? 'Φρέσκο' : `${info.keepsDays} μέρες`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-white px-10 py-5 flex flex-col">
                <span className="text-12 font-bold uppercase text-neutral-500">{label}</span>
                <span className="text-16 font-bold leading-tight">{value}</span>
              </div>
            ))}
          </div>
        )}
        </div>
        {/* Ingredients: the header and its list together. */}
        <div className="flex flex-col gap-10">
        {!ready && (
          <div className="flex items-center justify-between gap-10 border-b-3 border-black pb-5">
            <h3 className="text-16 tab:text-18 font-title font-bold uppercase">Υλικά</h3>
            <span className="px-10 py-[2px] border-2 border-black bg-main-teal text-14 font-title font-bold">
              για {servings} {servings === 1 ? 'μερίδα' : 'μερίδες'}
              {/* Food in pieces: what a portion is, in pieces. */}
              {recipe.pieces && (
                <span className="font-normal">
                  {' '}
                  · {recipe.pieces.count * servings} {recipe.pieces.count * servings === 1 ? recipe.pieces.one : recipe.pieces.many}
                </span>
              )}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-10">
          {/* One line each: name left; amount right, with the spoon hint
              in grey just before it. */}
          {recipe.ingredients.map((ing, i) => {
            const amount = ing.amount
            return (
            <div
              key={i}
              className="flex items-center justify-between gap-5 bg-white border-2 border-black font-bold px-10 py-5"
            >
              <span className="text-14 tab:text-16 text-black font-title min-w-0">{ing.name}</span>
              <span className="shrink-0 flex items-baseline gap-10 text-14 tab:text-16 text-black font-title whitespace-nowrap">
                {ing.unit === 'g' && spoonHint(amount) && (
                  <span className="text-12 tab:text-14 text-neutral-500 font-normal">{spoonHint(amount)}</span>
                )}
                {formatQuantity(amount, ing.unit, findDef(ing.name, ingredientCatalog))}
              </span>
            </div>
            )
          })}
        </div>
        </div>

        {recipe.instructions && (
          <div className="flex flex-col gap-10">
            <span className="text-16 tab:text-18 font-title font-bold uppercase">Εκτέλεση</span>
            <p className="text-14 tab:text-16 font-title whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
          </div>
        )}

        <div className="main-btn bg-main-yellow p-15 flex flex-col gap-5">
          <span className="text-14 tab:text-16 font-title font-bold uppercase">
            {Math.round(macros.calories)} kcal <span className="font-normal normal-case text-neutral-700">ανά μερίδα</span>
          </span>
          <span className="text-14 tab:text-16 font-title text-neutral-800">
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
