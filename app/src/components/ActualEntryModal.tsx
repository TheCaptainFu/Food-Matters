import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ActualEntry, IngredientDef, Recipe } from '../types'
import { recipeMacros } from '../nutrition'

type ActualEntryModalProps = {
  slotLabel: string
  recipes: Recipe[]
  ingredientCatalog: IngredientDef[]
  initial: ActualEntry | null
  onSave: (entry: ActualEntry) => void
  onDelete: () => void
  onClose: () => void
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
}: ActualEntryModalProps) {
  // Two clear steps instead of one field doing double duty: first search
  // your recipes (one tap logs it), or switch to a free-form entry for
  // anything that isn't a saved recipe. Editing an existing entry opens
  // straight on the form.
  const [step, setStep] = useState<'pick' | 'custom'>(initial ? 'custom' : 'pick')
  const [search, setSearch] = useState('')

  const [description, setDescription] = useState(initial?.description ?? '')
  const [calories, setCalories] = useState(initial?.calories ? String(initial.calories) : '')
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '')
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '')
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [isUploading, setIsUploading] = useState(false)

  const query = search.trim().toLowerCase()
  const matchingRecipes = recipes
    .filter((r) => r.title.toLowerCase().includes(query))
    .sort((a, b) => a.title.localeCompare(b.title))

  function pickRecipe(recipe: Recipe) {
    const m = recipeMacros(recipe, ingredientCatalog)
    onSave({
      description: recipe.title,
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
    })
  }

  function goToCustom() {
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

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[420px] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-20 font-title font-bold uppercase">What did you eat — {slotLabel}?</h2>

        {step === 'pick' ? (
          <>
            <input
              type="search"
              placeholder="Search your recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
              autoFocus
            />

            <div className="border-3 border-black max-h-[280px] overflow-y-auto">
              {matchingRecipes.length > 0 ? (
                matchingRecipes.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pickRecipe(r)}
                    className={
                      i < matchingRecipes.length - 1
                        ? 'w-full flex items-baseline justify-between gap-10 text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow border-b-2 border-black cursor-pointer'
                        : 'w-full flex items-baseline justify-between gap-10 text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow cursor-pointer'
                    }
                  >
                    <span>{r.title}</span>
                    <span className="text-12 font-normal text-neutral-500 whitespace-nowrap">
                      {Math.round(recipeMacros(r, ingredientCatalog).calories)} kcal
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-15 py-10 text-14 font-title text-neutral-500">
                  No recipes match “{search.trim()}”.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={goToCustom}
              className="border-2 border-dashed border-neutral-400 hover:border-black px-15 py-10 text-14 font-title font-bold text-left cursor-pointer"
            >
              + Something not in my recipes{search.trim() ? `: “${search.trim()}”` : ''}
            </button>

            <div className="flex gap-10 justify-end flex-wrap">
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">What did you eat?</span>
              <input
                type="text"
                placeholder="e.g. Souvlaki pita"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-10">
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Calories</span>
                <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Protein (g)</span>
                <input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Carbs (g)</span>
                <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Fat (g)</span>
                <input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} />
              </label>
            </div>

            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Photo (optional)</span>
              {photo ? (
                <div className="relative w-fit">
                  <img src={photo} alt="" className="main-btn max-h-[150px] object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    aria-label="Remove photo"
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
              {isUploading && <span className="text-12 font-title text-neutral-500">Uploading…</span>}
            </label>

            <div className="flex gap-10 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="main-btn font-title font-bold px-15 py-10 mr-auto"
              >
                ← Back
              </button>
              {initial && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="main-btn font-title font-bold bg-main-red text-white px-15 py-10"
                >
                  Delete
                </button>
              )}
              <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!description.trim()}
                className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
              >
                Save
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
