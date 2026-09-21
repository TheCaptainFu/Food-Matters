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
  const [description, setDescription] = useState(initial?.description ?? '')
  const [calories, setCalories] = useState(initial?.calories ? String(initial.calories) : '')
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '')
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '')
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [isUploading, setIsUploading] = useState(false)
  // Suggestions hide once you've picked one (or typed past a match) so
  // they don't linger open over an unrelated description you're typing.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false)

  const filteredRecipes =
    description.trim() && !suggestionsDismissed
      ? recipes.filter((r) => r.title.toLowerCase().includes(description.trim().toLowerCase()))
      : []

  function handleDescriptionChange(value: string) {
    setDescription(value)
    setSuggestionsDismissed(false)
  }

  function pickRecipe(recipe: Recipe) {
    const m = recipeMacros(recipe, ingredientCatalog)
    setDescription(recipe.title)
    setCalories(String(Math.round(m.calories)))
    setProtein(String(Math.round(m.protein)))
    setCarbs(String(Math.round(m.carbs)))
    setFat(String(Math.round(m.fat)))
    setSuggestionsDismissed(true)
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

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[400px] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-20 font-title font-bold uppercase">What did you eat — {slotLabel}?</h2>

        <label className="flex flex-col gap-5">
          <span className="text-14 font-title font-bold">What did you eat?</span>
          <input
            type="text"
            placeholder="Type freely, or search your recipes…"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="border-3 border-black px-10 py-5 font-title"
            autoFocus
          />
        </label>

        {filteredRecipes.length > 0 && (
          <div className="border-3 border-black max-h-[150px] overflow-y-auto">
            {filteredRecipes.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRecipe(r)}
                className={
                  i < filteredRecipes.length - 1
                    ? 'w-full text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow border-b-2 border-black'
                    : 'w-full text-left px-15 py-10 text-14 font-title font-bold hover:bg-main-yellow'
                }
              >
                {r.title}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-10">
          <label className="flex flex-col gap-5">
            <span className="text-14 font-title font-bold">Calories</span>
            <input
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
            />
          </label>
          <label className="flex flex-col gap-5">
            <span className="text-14 font-title font-bold">Protein (g)</span>
            <input
              type="number"
              min="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
            />
          </label>
          <label className="flex flex-col gap-5">
            <span className="text-14 font-title font-bold">Carbs (g)</span>
            <input
              type="number"
              min="0"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
            />
          </label>
          <label className="flex flex-col gap-5">
            <span className="text-14 font-title font-bold">Fat (g)</span>
            <input
              type="number"
              min="0"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="border-3 border-black px-10 py-5 font-title"
            />
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
      </div>
    </div>,
    document.body,
  )
}

export default ActualEntryModal
