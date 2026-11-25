import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ActualEntry, IngredientDef, Recipe } from '../types'
import { isOutsideFood } from '../types'
import { recipeMacros } from '../nutrition'
import AddRecipeModal from './AddRecipeModal'
import { plainText } from '../text'
import FoodRow from './FoodRow'
import AmountPicker from './AmountPicker'
import { rescaleEntry } from '../weekUtils'


type ActualEntryModalProps = {
  slotLabel: string
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  initial: ActualEntry | null
  onSave: (entry: ActualEntry) => void
  onDelete: () => void
  onClose: () => void
  // With these, "something that isn't in my recipes" opens the new-recipe
  // form (with ingredients): the recipe is saved and logged in one go.
  onAddRecipe?: (recipe: Recipe) => void
  onAddIngredientDef?: (def: IngredientDef) => void
}

// Keeps photos small enough for localStorage — a phone photo straight out of
// the camera can be several MB, which fills up the 5-10MB quota fast.
function resizeImageToDataUrl(file: File, maxDim = 900, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ActualEntryModal({
  slotLabel,
  recipes,
  ingredientCatalog,
  initial,
  onSave,
  onDelete,
  onClose,
  onAddRecipe,
  onAddIngredientDef,
}: ActualEntryModalProps) {
  // Two clear steps instead of one field doing double duty: first search
  // your recipes (one tap logs it), or switch to a free-form entry for
  // anything that isn't a saved recipe. Editing an existing entry opens
  // straight on the form.
  const [step, setStep] = useState<'pick' | 'custom' | 'newRecipe'>(initial ? 'custom' : 'pick')
  // Ingredients created while writing the new recipe — the catalog prop
  // only catches up on the next render, but the macros are needed now.
  const [newDefs, setNewDefs] = useState<IngredientDef[]>([])
  const [search, setSearch] = useState('')
  // How much of the dish you ate — set before tapping it.
  const [amount, setAmount] = useState(1)
  // Your own recipes, or the "eaten out" list (souvlaki, bakery, coffee…).

  const [description, setDescription] = useState(initial?.description ?? '')
  const [calories, setCalories] = useState(initial?.calories ? String(initial.calories) : '')
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '')
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '')
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [isUploading, setIsUploading] = useState(false)

  const query = plainText(search.trim())

  // Everything in Φαγητά: ♥ first, then home cooking, then coffee, souvlaki, bakery…
  const choices = recipes
    .filter((r) => plainText(r.title).includes(query))
    .map((r) => ({ recipe: r, calories: Math.round(recipeMacros(r, ingredientCatalog).calories) }))
    .sort(
      (x, y) =>
        Number(!!y.recipe.favorite) - Number(!!x.recipe.favorite) ||
        Number(isOutsideFood(x.recipe.category)) - Number(isOutsideFood(y.recipe.category)) ||
        x.recipe.title.localeCompare(y.recipe.title, 'el'),
    )

  function pickRecipe(recipe: Recipe) {
    const m = recipeMacros(recipe, [...ingredientCatalog, ...newDefs])
    // Rounded once, after scaling, so ½ of 125 kcal isn't 62 vs 63.
    const full = { description: recipe.title, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }
    onSave(rescaleEntry(full, amount))
  }


  function goToCustom() {
    if (onAddRecipe && onAddIngredientDef) {
      setStep('newRecipe')
      return
    }
    if (!description.trim() && search.trim()) setDescription(search.trim())
    setStep('custom')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsUploading(true)
    try {
      setPhoto(await resizeImageToDataUrl(file))
    } finally {
      setIsUploading(false)
    }
  }

  function handleSave() {
    if (!description.trim()) return
    onSave({
      description: description.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      photo,
    })
  }

  const inputClass = 'border-3 border-black px-10 py-5 font-title'

  if (step === 'newRecipe' && onAddRecipe && onAddIngredientDef) {
    return (
      <AddRecipeModal
        initialTitle={search.trim()}
        ingredientCatalog={[...ingredientCatalog, ...newDefs.filter((d) => !ingredientCatalog.some((c) => c.name === d.name))]}
        onAddIngredientDef={(def) => {
          setNewDefs((prev) => [...prev, def])
          onAddIngredientDef(def)
        }}
        onBack={() => setStep('pick')}
        onClose={onClose}
        onSave={(recipe) => {
          onAddRecipe(recipe)
          pickRecipe(recipe)
        }}
      />
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[420px] tab:max-w-[600px] overflow-x-hidden ${
          step === 'pick' ? 'max-h-[90vh] overflow-y-auto' : 'max-h-[85vh] overflow-y-auto'
        }`}
      >
        <div className="flex items-start justify-between gap-10">
          <h2 className="text-20 font-title font-bold uppercase leading-tight">Τι έφαγες — {slotLabel};</h2>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο" className="text-20 font-bold leading-none cursor-pointer pt-[2px]">
            ✕
          </button>
        </div>

        {step === 'pick' ? (
          <>
            <input
              type="search"
              placeholder="π.χ. φασολάδα, σουβλάκι, φρέντο…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} shrink-0`}
              autoFocus
            />

            <AmountPicker label="Πόσο έφαγες;" value={amount} onChange={setAmount} />

            <div className="border-3 border-black overflow-hidden">
            <div className="max-h-[260px] tab:max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
                {choices.length > 0 ? (
                  choices.map((c) => (
                    <FoodRow
                      key={c.recipe.id}
                      recipe={c.recipe}
                      ingredientCatalog={ingredientCatalog}
                      onClick={() => pickRecipe(c.recipe)}
                    />
                  ))
                ) : (
                  <p className="px-15 py-10 text-14 font-title text-neutral-500">
                    Δεν βρέθηκε «{search.trim()}». Πρόσθεσέ το με το κουμπί από κάτω.
                  </p>
                )}
              </div>
          </div>

            <div className="flex items-center justify-between gap-10">
              <button
                type="button"
                onClick={goToCustom}
                className="main-btn font-title font-bold px-15 py-10 bg-main-yellow"
              >
                + Νέο φαγητό
              </button>
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Άκυρο
              </button>
            </div>

          </>
        ) : (
          <>
            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Τι έφαγες;</span>
              <input
                type="text"
                placeholder="π.χ. Σουβλάκι πίτα"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-10">
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Θερμίδες</span>
                <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Πρωτεΐνη (g)</span>
                <input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Υδατάνθρακες (g)</span>
                <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Λιπαρά (g)</span>
                <input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} />
              </label>
            </div>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Φωτογραφία (προαιρετικά)</span>
              {photo ? (
                <div className="relative w-fit">
                  <img src={photo} alt="" className="main-btn max-h-[150px] object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    aria-label="Αφαίρεση φωτογραφίας"
                    className="absolute -top-10 -right-10 main-btn w-25 h-25 flex items-center justify-center bg-main-red text-white font-bold p-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="text-14 font-title"
                />
              )}
              {isUploading && <span className="text-12 font-title text-neutral-500">Ανέβασμα…</span>}
            </label>

            <div className="flex gap-10 justify-end flex-wrap">
              {/* Only when we got here from the recipe list — editing an
                  existing entry opens straight on this form, with nothing
                  to go back to. */}
              {!initial && (
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="main-btn font-title font-bold px-15 py-10 mr-auto"
                >
                  ← Πίσω
                </button>
              )}
              {initial && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="main-btn font-title font-bold bg-main-red text-white px-15 py-10 mr-auto"
                >
                  Διαγραφή
                </button>
              )}
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Άκυρο
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!description.trim()}
                className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
              >
                Αποθήκευση
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default ActualEntryModal
