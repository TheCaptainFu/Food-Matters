import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import type { IngredientDef } from '../types'
import {
  calculateMacroTargets,
  calorieBreakdown,
  suggestedMacroTargets,
  calculateWaterTargetMl,
  ACTIVITY_LEVELS,
  GOALS,
  PACES,
} from '../nutrition'
import type { Profile } from '../nutrition'
import { DIET_TYPES } from '../dietaryRestrictions'
import { signInWithProvider, signOut } from '../useAuth'
import { supabase } from '../supabaseClient'

type ProfileModalProps = {
  profile: Profile | null
  ingredientCatalog: IngredientDef[]
  user: User | null
  onSaveProfile: (profile: Profile) => void
  onClose: () => void
}

type MacroKey = 'protein' | 'carbs' | 'fat'
type MacroFields = Record<MacroKey, string>

const MACRO_FIELDS: { key: MacroKey; label: string; kcalPerGram: number }[] = [
  { key: 'protein', label: 'Πρωτεΐνη', kcalPerGram: 4 },
  { key: 'carbs', label: 'Υδατάνθρακες', kcalPerGram: 4 },
  { key: 'fat', label: 'Λιπαρά', kcalPerGram: 9 },
]

const inputClass = 'border-3 border-black px-15 py-10 text-16 font-title w-full'
const labelClass = 'text-16 font-title font-bold'
const sectionTitleClass = 'text-18 font-title font-bold uppercase'

// A row of buttons for a small fixed set of choices (sex, goal) — every
// option visible at once, instead of hidden behind a dropdown.
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            o.value === value
              ? 'main-btn font-title font-bold text-16 px-15 py-10 bg-main-blue text-white'
              : 'main-btn font-title font-bold text-16 px-15 py-10'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// An on/off option styled like the activity cards — the whole card is the
// click target, with a check box in the corner showing its state.
function ToggleCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'flex items-start gap-10 text-left px-15 py-10 border-3 border-black bg-main-blue text-white shadow-[3px_3px_0_0_#000] cursor-pointer'
          : 'flex items-start gap-10 text-left px-15 py-10 border-3 border-black bg-white hover:bg-neutral-50 cursor-pointer'
      }
    >
      <span
        aria-hidden="true"
        className={
          checked
            ? 'w-20 h-20 shrink-0 mt-[1px] border-2 border-white bg-white text-main-blue font-bold text-14 flex items-center justify-center'
            : 'w-20 h-20 shrink-0 mt-[1px] border-2 border-black bg-white'
        }
      >
        {checked && '✓'}
      </span>
      <span className="flex flex-col gap-5">
        <span className="text-16 font-title font-bold">{title}</span>
        <span className={checked ? 'text-14 font-title text-white/90' : 'text-14 font-title text-neutral-500'}>
          {description}
        </span>
      </span>
    </button>
  )
}

function ProfileModal({ profile, ingredientCatalog, user, onSaveProfile, onClose }: ProfileModalProps) {
  const [age, setAge] = useState(profile?.age ?? 30)
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? 70)
  const [heightCm, setHeightCm] = useState(profile?.heightCm ?? 175)
  const [sex, setSex] = useState<Profile['sex']>(profile?.sex ?? 'male')
  const [activity, setActivity] = useState<Profile['activity']>(profile?.activity ?? 'moderate')
  const [goal, setGoal] = useState<Profile['goal']>(profile?.goal ?? 'maintain')
  const [pace, setPace] = useState<Profile['pace']>(profile?.pace ?? 'normal')
  const [worksOut, setWorksOut] = useState(profile?.worksOut ?? false)
  const [takesProtein, setTakesProtein] = useState(profile?.takesProtein ?? false)
  const [takesCreatine, setTakesCreatine] = useState(profile?.takesCreatine ?? false)
  const [diet, setDiet] = useState<Profile['diet']>(profile?.diet ?? 'none')
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(profile?.excludedIngredients ?? [])
  const [excludeSearch, setExcludeSearch] = useState('')

  const excludeSuggestions =
    excludeSearch.trim().length === 0
      ? []
      : ingredientCatalog
          .filter(
            (c) =>
              c.name.toLowerCase().includes(excludeSearch.trim().toLowerCase()) &&
              !excludedIngredients.some((e) => e.toLowerCase() === c.name.toLowerCase()),
          )
          .slice(0, 6)

  function addExcludedIngredient(name: string) {
    setExcludedIngredients((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setExcludeSearch('')
  }

  function removeExcludedIngredient(name: string) {
    setExcludedIngredients((prev) => prev.filter((n) => n !== name))
  }

  // Macro targets follow the suggestion (derived from the vitals below) until
  // the user types their own; customMacros holds those overrides, and null
  // means "use the suggestion". Derived during render rather than synced in
  // an effect, so there's no extra render and no stale values.
  const vitals = { age, weightKg, heightCm, sex, activity, goal, pace, worksOut }
  const suggested = suggestedMacroTargets(vitals)
  const breakdown = calorieBreakdown(vitals)
  const [customMacros, setCustomMacros] = useState<MacroFields | null>(() => {
    if (!profile || (profile.customProtein == null && profile.customCarbs == null && profile.customFat == null)) {
      return null
    }
    const saved = calculateMacroTargets(profile)
    return { protein: String(saved.protein), carbs: String(saved.carbs), fat: String(saved.fat) }
  })
  const macros: MacroFields = customMacros ?? {
    protein: String(suggested.protein),
    carbs: String(suggested.carbs),
    fat: String(suggested.fat),
  }

  function setMacro(key: MacroKey, value: string) {
    setCustomMacros({ ...macros, [key]: value })
  }

  // Changing anything the suggestion depends on goes back to following it —
  // a custom value only "sticks" until the next thing that would change it.
  function followSuggestion<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setCustomMacros(null)
    }
  }

  const previewCalories = Math.round(
    (Number(macros.protein) || 0) * 4 + (Number(macros.carbs) || 0) * 4 + (Number(macros.fat) || 0) * 9,
  )
  const waterL = (calculateWaterTargetMl({ weightKg, worksOut }) / 1000).toFixed(1)

  function saveProfile() {
    onSaveProfile({
      age,
      weightKg,
      heightCm,
      sex,
      activity,
      goal,
      pace,
      worksOut,
      takesProtein,
      takesCreatine,
      customProtein: customMacros ? Number(customMacros.protein) || 0 : undefined,
      customCarbs: customMacros ? Number(customMacros.carbs) || 0 : undefined,
      customFat: customMacros ? Number(customMacros.fat) || 0 : undefined,
      diet,
      excludedIngredients,
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col w-full max-w-[620px] max-h-[90vh]"
      >
        {/* Header: who you are, and the result everything below feeds into —
            pinned, so you see your targets change as you edit. */}
        <div className="flex flex-col gap-15 sm:gap-20 p-20 sm:p-30 sm:pb-20 border-b-3 border-black">
          <div className="flex items-start justify-between gap-15">
            <div className="flex flex-col gap-5">
              <h2 className="text-22 sm:text-26 font-title font-bold uppercase">
                {profile ? 'Το προφίλ σου' : 'Καλώς ήρθες στο Food Matters'}
              </h2>
              {!profile && (
                <p className="text-16 font-title text-neutral-500">
                  Μερικά στοιχεία για να υπολογίσουμε τους ημερήσιους στόχους σου. Μπορείς να τα αλλάξεις όποτε θες.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="font-bold text-20 leading-none hover:text-main-red cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-10">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="w-30 h-30 border-2 border-black object-cover shrink-0"
                />
              )}
              <span className="flex-1 min-w-0 text-14 font-title truncate">
                Σύνδεση ως <span className="font-bold">{user.user_metadata?.full_name ?? user.email}</span>
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-14 font-title font-bold underline cursor-pointer shrink-0"
              >
                Αποσύνδεση
              </button>
            </div>
          ) : (
            <p className="text-14 font-title text-neutral-500">
              Χρησιμοποιείς το Food Matters ως επισκέπτης, οπότε τα δεδομένα σου μένουν μόνο σε αυτόν τον browser.
              {supabase && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => signInWithProvider('google')}
                    className="font-bold text-black underline cursor-pointer"
                  >
                    Συνδέσου
                  </button>{' '}
                  για να τα κρατήσεις.
                </>
              )}
            </p>
          )}

          <div className="bg-main-yellow border-2 border-black px-20 py-15 flex flex-wrap items-baseline justify-between gap-x-20 gap-y-5 font-title">
            <span className="text-14 font-bold uppercase">Ο ημερήσιος στόχος σου</span>
            <span className="text-16">
              <span className="text-22 font-bold">{previewCalories} kcal</span> · Π {macros.protein || 0}g · Υ{' '}
              {macros.carbs || 0}g · Λ {macros.fat || 0}g · 💧 {waterL} L
            </span>
          </div>
        </div>

        {/* Scrolling body */}
        <div className="flex flex-col gap-40 p-20 sm:p-30 overflow-y-auto">
          <section className="flex flex-col gap-20">
            <span className={sectionTitleClass}>Στοιχεία σου</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-20 gap-y-20">
              <div className="flex flex-col gap-10">
                <span className={labelClass}>Φύλο</span>
                <Segmented
                  options={[
                    { value: 'male', label: 'Άνδρας' },
                    { value: 'female', label: 'Γυναίκα' },
                  ]}
                  value={sex}
                  onChange={followSuggestion(setSex)}
                />
              </div>
              <label className="flex flex-col gap-10">
                <span className={labelClass}>Ηλικία</span>
                <input
                  type="number"
                  min="0"
                  value={age}
                  onChange={(e) => followSuggestion(setAge)(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-10">
                <span className={labelClass}>Βάρος (kg)</span>
                <input
                  type="number"
                  min="0"
                  value={weightKg}
                  onChange={(e) => followSuggestion(setWeightKg)(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-10">
                <span className={labelClass}>Ύψος (cm)</span>
                <input
                  type="number"
                  min="0"
                  value={heightCm}
                  onChange={(e) => followSuggestion(setHeightCm)(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
            </div>
            {age > 0 && age < 18 && (
              <p className="text-14 font-title bg-main-orange/30 border-2 border-black px-15 py-10">
                Οι υπολογισμοί είναι για ενήλικες. Για παιδιά και εφήβους μίλα με παιδίατρο ή διατροφολόγο.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-20 border-t-2 border-neutral-200 pt-40">
            <span className={sectionTitleClass}>Στόχος & δραστηριότητα</span>
            <div className="flex flex-col gap-10">
              <span className={labelClass}>Στόχος</span>
              <Segmented options={GOALS} value={goal} onChange={followSuggestion(setGoal)} />
            </div>
            {goal !== 'maintain' && (
              <div className="flex flex-col gap-10">
                <span className={labelClass}>Ρυθμός</span>
                <Segmented options={PACES} value={pace} onChange={followSuggestion(setPace)} />
                <span className="text-14 font-title text-neutral-500">
                  {goal === 'lose'
                    ? `${Math.round((PACES.find((p) => p.value === pace)?.lose ?? 0) * 100)}% λιγότερες θερμίδες από όσες καις. ${
                        pace === 'fast' ? 'Πιο γρήγορα αποτελέσματα, αλλά πιο δύσκολο να το κρατήσεις.' : 'Βιώσιμος ρυθμός για τους περισσότερους.'
                      }`
                    : `${Math.round((PACES.find((p) => p.value === pace)?.gain ?? 0) * 100)}% περισσότερες θερμίδες από όσες καις. ${
                        pace === 'fast' ? 'Περισσότερος όγκος, αλλά και περισσότερο λίπος.' : 'Αργή αύξηση με λιγότερο λίπος.'
                      }`}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-10">
              <span className={labelClass}>Επίπεδο δραστηριότητας</span>
              {/* Cards instead of a dropdown: each level's description says how
                  often you exercise, and they need to be readable side by side. */}
              <div role="radiogroup" aria-label="Επίπεδο δραστηριότητας" className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {ACTIVITY_LEVELS.map((a) => {
                  const isSelected = a.value === activity
                  return (
                    <button
                      key={a.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => followSuggestion(setActivity)(a.value)}
                      className={
                        isSelected
                          ? 'flex flex-col gap-5 text-left px-15 py-10 border-3 border-black bg-main-blue text-white shadow-[3px_3px_0_0_#000] cursor-pointer'
                          : 'flex flex-col gap-5 text-left px-15 py-10 border-3 border-black bg-white hover:bg-neutral-50 cursor-pointer'
                      }
                    >
                      <span className="text-16 font-title font-bold">{a.label}</span>
                      <span className={isSelected ? 'text-14 font-title text-white/90' : 'text-14 font-title text-neutral-500'}>
                        {a.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-10">
              <span className={labelClass}>Προπόνηση & συμπληρώματα</span>
              <div className="flex flex-col gap-10">
                <ToggleCard
                  checked={worksOut}
                  onChange={followSuggestion(setWorksOut)}
                  title="Προπόνηση με βάρη"
                  description="Κάνω βάρη τακτικά. Ανεβάζει τον στόχο πρωτεΐνης και νερού."
                />
                <ToggleCard
                  checked={takesProtein}
                  onChange={setTakesProtein}
                  title="Σκόνη πρωτεΐνης"
                  description="Το πρόγραμμα προτείνει σέικ τις μέρες που λείπει πρωτεΐνη."
                />
                <ToggleCard
                  checked={takesCreatine}
                  onChange={setTakesCreatine}
                  title="Κρεατίνη"
                  description="Δεν έχει θερμίδες, αλλά πίνε περισσότερο νερό."
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-20 border-t-2 border-neutral-200 pt-40">
            <span className={sectionTitleClass}>Διατροφικές προτιμήσεις</span>

            <div className="flex flex-col gap-10">
              <span className={labelClass}>Διατροφή</span>
              <Segmented options={DIET_TYPES} value={diet} onChange={setDiet} />
            </div>

            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-5">
                <span className={labelClass}>Υλικά που αποφεύγεις</span>
                <span className="text-14 font-title text-neutral-500">
                  Αλλεργίες ή πράγματα που δεν σου αρέσουν. Οι προτάσεις θα παραλείπουν συνταγές που τα έχουν.
                </span>
              </div>

              <div className="relative">
                <input
                  type="search"
                  placeholder="Πρόσθεσε υλικό, π.χ. καρύδια…"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  className={inputClass}
                />
                {excludeSuggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-white border-3 border-t-0 border-black shadow-[4px_4px_0_0_#000] max-h-[220px] overflow-y-auto">
                    {excludeSuggestions.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => addExcludedIngredient(c.name)}
                        className="flex w-full items-center justify-between gap-10 text-left px-15 py-10 text-16 font-title font-bold hover:bg-main-yellow border-b border-neutral-200 last:border-b-0 cursor-pointer"
                      >
                        {c.name}
                        <span className="text-14 font-normal text-neutral-500">+ Αποφυγή</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {excludedIngredients.length > 0 ? (
                <div className="flex flex-wrap gap-10">
                  {excludedIngredients.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-10 pl-10 pr-5 py-5 text-14 font-title font-bold bg-main-red/20 border-2 border-black"
                    >
                      🚫 {name}
                      <button
                        type="button"
                        onClick={() => removeExcludedIngredient(name)}
                        aria-label={`Αφαίρεση: ${name}`}
                        title="Αφαίρεση"
                        className="w-20 h-20 flex items-center justify-center leading-none hover:bg-black hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-14 font-title text-neutral-400">Δεν έχεις εξαιρέσει τίποτα.</span>
              )}
            </div>
          </section>

          {/* How the calorie target is worked out, step by step, so it's not
              a magic number. */}
          <section className="flex flex-col gap-15 border-t-2 border-neutral-200 pt-40">
            <span className={sectionTitleClass}>Πώς βγαίνει ο στόχος</span>
            <div className="flex flex-col border-2 border-black font-title text-14">
              <div className="flex items-baseline justify-between gap-10 px-15 py-10 border-b border-neutral-200">
                <span>
                  <span className="font-bold">Μεταβολισμός ηρεμίας</span>
                  <span className="block text-12 text-neutral-500">Όσα καις χωρίς να κουνηθείς (Mifflin-St Jeor)</span>
                </span>
                <span className="font-bold whitespace-nowrap">{breakdown.bmr} kcal</span>
              </div>
              <div className="flex items-baseline justify-between gap-10 px-15 py-10 border-b border-neutral-200">
                <span>
                  <span className="font-bold">Με τη δραστηριότητά σου</span>
                  <span className="block text-12 text-neutral-500">Αν τρως τόσες, το βάρος σου μένει ίδιο</span>
                </span>
                <span className="font-bold whitespace-nowrap">{breakdown.maintenance} kcal</span>
              </div>
              {goal !== 'maintain' && (
                <div className="flex items-baseline justify-between gap-10 px-15 py-10 border-b border-neutral-200">
                  <span>
                    <span className="font-bold">{goal === 'lose' ? 'Έλλειμμα για απώλεια' : 'Πλεόνασμα για αύξηση'}</span>
                    {breakdown.hitFloor && (
                      <span className="block text-12 text-main-red">
                        Περιορίστηκε για να μην πέσεις κάτω από {sex === 'female' ? 1200 : 1500} kcal
                      </span>
                    )}
                  </span>
                  <span className="font-bold whitespace-nowrap">
                    {breakdown.adjustment > 0 ? '+' : ''}
                    {breakdown.adjustment} kcal
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-10 px-15 py-10 bg-main-yellow">
                <span className="font-bold uppercase">Ημερήσιος στόχος</span>
                <span className="text-18 font-bold whitespace-nowrap">{breakdown.calories} kcal</span>
              </div>
            </div>
            {goal === 'lose' && (
              <span className="text-12 font-title text-neutral-500">
                Περίπου {((-breakdown.adjustment * 7) / 7700).toFixed(1).replace('.', ',')} kg την εβδομάδα. Οι
                υπολογισμοί είναι εκτιμήσεις, όχι ιατρική συμβουλή.
              </span>
            )}
          </section>

          <section className="flex flex-col gap-15 border-t-2 border-neutral-200 pt-40">
            <div className="flex items-center justify-between gap-10">
              <span className={sectionTitleClass}>Στόχοι μακροθρεπτικών</span>
              {customMacros && (
                <button
                  type="button"
                  onClick={() => setCustomMacros(null)}
                  className="text-14 font-title font-bold underline text-neutral-500 hover:text-black cursor-pointer"
                >
                  Επαναφορά προτεινόμενων
                </button>
              )}
            </div>
            <span className="text-14 font-title text-neutral-500">
              {customMacros
                ? 'Δικά σου νούμερα. Αν αλλάξεις κάτι από πάνω, επιστρέφουν στα προτεινόμενα.'
                : 'Προτείνονται από τα στοιχεία σου. Γράψε δικά σου νούμερα αν θες να τα αλλάξεις.'}
            </span>
            {/* One card per macro: grams to type, and what that is in kcal
                and as a share of the day, so the numbers mean something. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-15">
              {MACRO_FIELDS.map(({ key, label, kcalPerGram }) => {
                const grams = Number(macros[key]) || 0
                const kcal = grams * kcalPerGram
                const share = previewCalories > 0 ? Math.round((kcal / previewCalories) * 100) : 0
                return (
                  <label
                    key={key}
                    className={
                      customMacros
                        ? 'flex flex-col gap-10 border-2 border-main-blue p-15'
                        : 'flex flex-col gap-10 border-2 border-black p-15'
                    }
                  >
                    <span className="text-14 font-title font-bold uppercase">{label}</span>
                    <span className="flex items-center border-3 border-black focus-within:border-main-blue">
                      <input
                        type="number"
                        min="0"
                        value={macros[key]}
                        onChange={(e) => setMacro(key, e.target.value)}
                        className="px-15 py-10 text-20 font-title font-bold w-full min-w-0 outline-none"
                      />
                      <span className="pr-15 text-16 font-title text-neutral-500">g</span>
                    </span>
                    <span className="text-12 font-title text-neutral-500">
                      {Math.round(kcal)} kcal · {share}% της μέρας
                    </span>
                  </label>
                )
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-15 justify-end px-20 sm:px-30 py-15 sm:py-20 border-t-3 border-black">
          <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
            {profile ? 'Άκυρο' : 'Αργότερα'}
          </button>
          <button
            type="button"
            onClick={saveProfile}
            className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ProfileModal
