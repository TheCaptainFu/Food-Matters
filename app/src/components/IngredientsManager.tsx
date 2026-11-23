import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroceryCategory, IngredientDef, Recipe } from '../types'
import { GROCERY_CATEGORIES } from '../types'
import ConfirmModal from './ConfirmModal'

type IngredientsManagerProps = {
  catalog: IngredientDef[]
  recipes: Recipe[]
  onAdd: (def: IngredientDef) => void
  onEdit: (oldName: string, def: IngredientDef) => void
  onDelete: (name: string) => void
}

// The one place to add, fix or remove ingredients (name, aisle, nutrition
// per 100g). Choosing ingredients for a recipe is pick-only on purpose, so
// changes that affect every recipe using an ingredient happen here, knowingly.
function IngredientsManager({ catalog, recipes, onAdd, onEdit, onDelete }: IngredientsManagerProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | GroceryCategory>('all')
  // null = closed; { original: null } = adding; { original: def } = editing def
  const [form, setForm] = useState<{ original: IngredientDef | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // How many recipes use each ingredient — shown in the list, and an
  // ingredient that's still in use can't be deleted.
  const usage = new Map<string, number>()
  recipes.forEach((r) =>
    new Set(r.ingredients.map((i) => i.name)).forEach((name) => usage.set(name, (usage.get(name) ?? 0) + 1)),
  )

  const query = search.trim().toLowerCase()
  const visible = catalog.filter(
    (c) => (categoryFilter === 'all' || c.category === categoryFilter) && c.name.toLowerCase().includes(query),
  )
  const usedCategories = GROCERY_CATEGORIES.filter((g) => catalog.some((c) => c.category === g.value))

  const cell = 'px-10 py-10 text-right whitespace-nowrap'

  return (
    <div className="flex flex-col gap-20">
      <div className="flex flex-wrap items-center gap-10">
        <input
          type="search"
          placeholder="Αναζήτηση υλικών…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-3 border-black px-15 py-10 font-title flex-1 min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | GroceryCategory)}
          className="bg-white border-3 border-black pl-15 pr-30 py-10 font-title flex-1 min-w-0 sm:flex-none"
        >
          <option value="all">Όλοι οι διάδρομοι</option>
          {usedCategories.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setForm({ original: null })}
          className="main-btn whitespace-nowrap font-title font-bold px-15 py-10 bg-main-blue text-white"
        >
          + Νέο υλικό
        </button>
      </div>

      <p className="text-14 font-title text-neutral-500">
        Οι διατροφικές τιμές είναι ανά 100g. Οι αλλαγές ισχύουν για κάθε συνταγή που έχει το υλικό.
      </p>

      <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] overflow-x-auto">
        <table className="w-full text-14 font-title border-collapse">
          <thead>
            <tr className="border-b-3 border-black text-12 uppercase">
              <th className="px-10 py-10 text-left">Υλικό</th>
              <th className="px-10 py-10 text-left hidden sm:table-cell">Διάδρομος</th>
              <th className={cell}>kcal</th>
              <th className={cell}>Πρωτεΐνη</th>
              <th className={cell}>Υδατάνθρακες</th>
              <th className={cell}>Λιπαρά</th>
              <th className={cell}>Χρήση</th>
              <th className="px-10 py-10" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-10 py-15 text-center text-neutral-500">
                  Κανένα υλικό δεν ταιριάζει.
                </td>
              </tr>
            )}
            {visible.map((c) => {
              const usedIn = usage.get(c.name) ?? 0
              return (
                <tr key={c.name} className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-10 py-10 font-bold">{c.name}</td>
                  <td className="px-10 py-10 text-neutral-500 whitespace-nowrap hidden sm:table-cell">
                    {GROCERY_CATEGORIES.find((g) => g.value === c.category)?.label ?? 'Άλλα'}
                  </td>
                  <td className={cell}>{Math.round(c.caloriesPer100g)}</td>
                  <td className={cell}>{c.proteinPer100g}g</td>
                  <td className={cell}>{c.carbsPer100g}g</td>
                  <td className={cell}>{c.fatPer100g}g</td>
                  <td className={`${cell} text-neutral-500`}>
                    {usedIn === 0 ? '—' : `${usedIn} ${usedIn === 1 ? 'συνταγή' : 'συνταγές'}`}
                  </td>
                  <td className="px-10 py-10 whitespace-nowrap text-right">
                    <span className="inline-flex gap-15">
                      <button
                        type="button"
                        onClick={() => setForm({ original: c })}
                        className="font-bold underline cursor-pointer"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        type="button"
                        disabled={usedIn > 0}
                        onClick={() => setConfirmDelete(c.name)}
                        title={
                          usedIn > 0
                            ? `Υπάρχει σε ${usedIn} ${usedIn === 1 ? 'συνταγή' : 'συνταγές'}. Αφαίρεσέ το πρώτα από εκεί.`
                            : 'Διαγραφή'
                        }
                        className="font-bold underline text-main-red cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                      >
                        Διαγραφή
                      </button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <IngredientFormModal
          original={form.original}
          catalog={catalog}
          usedIn={form.original ? (usage.get(form.original.name) ?? 0) : 0}
          onClose={() => setForm(null)}
          onSave={(def) => {
            if (form.original) onEdit(form.original.name, def)
            else onAdd(def)
            setForm(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Διαγραφή του «${confirmDelete}» από τα υλικά σου;`}
          confirmLabel="Διαγραφή"
          onConfirm={() => {
            onDelete(confirmDelete)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

type IngredientFormModalProps = {
  original: IngredientDef | null
  catalog: IngredientDef[]
  usedIn: number
  onClose: () => void
  onSave: (def: IngredientDef) => void
}

function IngredientFormModal({ original, catalog, usedIn, onClose, onSave }: IngredientFormModalProps) {
  const [name, setName] = useState(original?.name ?? '')
  const [category, setCategory] = useState<GroceryCategory>(original?.category ?? 'other')
  const [calories, setCalories] = useState(original ? String(original.caloriesPer100g) : '')
  const [protein, setProtein] = useState(original ? String(original.proteinPer100g) : '')
  const [carbs, setCarbs] = useState(original ? String(original.carbsPer100g) : '')
  const [fat, setFat] = useState(original ? String(original.fatPer100g) : '')
  const [gramsPerPiece, setGramsPerPiece] = useState(original?.gramsPerPiece ? String(original.gramsPerPiece) : '')

  const trimmed = name.trim()
  const isDuplicate = catalog.some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.name !== original?.name,
  )
  const canSave = trimmed.length > 0 && !isDuplicate

  const inputClass = 'border-3 border-black px-10 py-5 font-title w-full'

  function save() {
    if (!canSave) return
    onSave({
      name: trimmed,
      category,
      caloriesPer100g: Number(calories) || 0,
      proteinPer100g: Number(protein) || 0,
      carbsPer100g: Number(carbs) || 0,
      fatPer100g: Number(fat) || 0,
      gramsPerPiece: Number(gramsPerPiece) > 0 ? Number(gramsPerPiece) : undefined,
      pieceName: Number(gramsPerPiece) > 0 ? original?.pieceName : undefined,
    })
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-20 sm:p-30 flex flex-col gap-15 w-full max-w-[420px] max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-20 font-title font-bold uppercase">{original ? 'Επεξεργασία υλικού' : 'Νέο υλικό'}</h2>
        {original && usedIn > 0 && (
          <p className="text-14 font-title text-neutral-500">
            Υπάρχει σε {usedIn} {usedIn === 1 ? 'συνταγή' : 'συνταγές'}. Οι αλλαγές ισχύουν για όλες.
          </p>
        )}

        <label className="flex flex-col gap-5">
          <span className="text-14 font-title font-bold">Όνομα</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          {isDuplicate && <span className="text-14 font-title text-main-red">Υπάρχει ήδη υλικό με αυτό το όνομα.</span>}
        </label>

        <label className="flex flex-col gap-5">
          <span className="text-14 font-title font-bold">Διάδρομος</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as GroceryCategory)}
            className="bg-white border-3 border-black pl-10 pr-30 py-5 font-title w-full"
          >
            {GROCERY_CATEGORIES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-5">
          <span className="text-14 font-title font-bold">Θερμίδες ανά 100g</span>
          <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} />
        </label>

        <div className="grid grid-cols-3 gap-10">
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
          <span className="text-14 font-title font-bold">Γραμμάρια ανά τεμάχιο (προαιρετικό)</span>
          <input
            type="number"
            min="0"
            placeholder="π.χ. 60 για ένα αυγό"
            value={gramsPerPiece}
            onChange={(e) => setGramsPerPiece(e.target.value)}
            className={inputClass}
          />
          <span className="text-12 font-title text-neutral-500">
            Για ό,τι μετράς σε κομμάτια, ώστε οι συνταγές να γράφουν «2 αυγά» αντί για γραμμάρια.
          </span>
        </label>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10 mr-auto">
            ← Πίσω
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10 disabled:opacity-30 disabled:pointer-events-none"
          >
            {original ? 'Αποθήκευση' : 'Προσθήκη'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default IngredientsManager
