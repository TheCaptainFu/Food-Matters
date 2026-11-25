import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ActualEntry, Category, IngredientDef, Recipe } from '../types'
import { CATEGORIES, isOutsideFood } from '../types'
import { recipeMacros } from '../nutrition'
import ScrollRow from './ScrollRow'
import AddRecipeModal from './AddRecipeModal'
import { plainText } from '../text'


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
  // Your own recipes, or the "eaten out" list (souvlaki, bakery, coffee…).
  // One list for everything — your recipes and the usual things eaten out
  // (souvlaki, bakery, coffee…) — with chips to narrow it down.
  const [filter, setFilter] = useState<'all' | 'home' | Category>('all')

  const [description, setDescription] = useState(initial?.description ?? '')
  const [calories, setCalories] = useState(initial?.calories ? String(initial.calories) : '')
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '')
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '')
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [isUploading, setIsUploading] = useState(false)

  const query = plainText(search.trim())

  // Everything in Φαγητά: home cooking first, then coffee, souvlaki, bakery…
  const choices = recipes
    .filter((r) => (filter === 'all' ? true : filter === 'home' ? !isOutsideFood(r.category) : r.category === filter))
    .filter((r) => plainText(r.title).includes(query))
    .map((r) => ({ recipe: r, calories: Math.round(recipeMacros(r, ingredientCatalog).calories) }))
    .sort(
      (x, y) =>
        Number(isOutsideFood(x.recipe.category)) - Number(isOutsideFood(y.recipe.category)) ||
        x.recipe.title.localeCompare(y.recipe.title, 'el'),
    )

  function pickRecipe(recipe: Recipe) {
    const m = recipeMacros(recipe, [...ingredientCatalog, ...newDefs])
    onSave({
      description: recipe.title,
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
    })
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
        initialCategory={filter !== 'all' && filter !== 'home' ? filter : undefined}
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
        className={`main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[420px] overflow-x-hidden ${
          step === 'pick' ? 'h-[85vh] max-h-[680px]' : 'max-h-[85vh] overflow-y-auto'
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

            {/* Chips run to the dialog's edges and fade there, so it's clear they scroll. */}
            <ScrollRow className="-my-5 -mx-20 px-20 sm:-mx-30 sm:px-30 shrink-0">
              {(
                [
                  { value: 'all', label: 'Όλα' },
                  { value: 'home', label: '🍳 Σπιτικά' },
                  ...CATEGORIES.filter((c) => c.out),
                ] as { value: typeof filter; label: string }[]
              ).map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFilter(g.value)}
                  className={
                    g.value === filter
                      ? 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-12 px-10 py-5 bg-black text-white'
                      : 'main-btn shrink-0 whitespace-nowrap font-title font-bold text-12 px-10 py-5'
                  }
                >
                  {g.label}
                </button>
              ))}
            </ScrollRow>

            <div className="flex-1 min-h-0 border-3 border-black overflow-y-auto [scrollbar-width:thin]">
              {choices.length > 0 ? (
                choices.map((c) => (
                  <button
                    key={c.recipe.id}
                    type="button"
                    onClick={() => pickRecipe(c.recipe)}
                    className="w-full flex items-baseline justify-between gap-10 text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow border-b-2 border-black last:border-b-0 cursor-pointer"
                  >
                    <span>{c.recipe.title}</span>
                    <span className="text-12 font-normal text-neutral-500 whitespace-nowrap">{c.calories} kcal</span>
                  </button>
                ))
              ) : (
                <p className="px-15 py-10 text-14 font-title text-neutral-500">
                  Δεν βρέθηκε «{search.trim()}». Πρόσθεσέ το με το κουμπί από κάτω.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={goToCustom}
              className="shrink-0 border-2 border-dashed border-neutral-400 hover:border-black px-15 py-10 text-14 font-title font-bold text-left cursor-pointer"
            >
              + Δεν το βρίσκω, νέο φαγητό{search.trim() ? `: «${search.trim()}»` : ''}
            </button>

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
