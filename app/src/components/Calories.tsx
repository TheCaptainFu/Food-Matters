import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Recipe, Week, Day, SlotKey, IngredientDef } from '../types'
import {
  estimateMacros,
  recipeMacros,
  calculateMacroTargets,
  suggestedMacroTargets,
  ACTIVITY_LEVELS,
  GOALS,
} from '../nutrition'
import type { Profile, Macros } from '../nutrition'
import { DIET_TYPES } from '../dietaryRestrictions'

type CaloriesProps = {
  recipes: Recipe[]
  weeks: Week[]
  ingredientCatalog: IngredientDef[]
  profile: Profile | null
  onSaveProfile: (profile: Profile) => void
  onOpenRecipe: (id: string) => void
}

// badge classes are literal Tailwind class strings (kept whole, not
// interpolated) so the CSS build can detect them in this file
const SLOTS: { key: SlotKey; label: string; badge: string }[] = [
  { key: 'breakfast', label: 'Breakfast', badge: 'bg-main-yellow text-black' },
  { key: 'lunch', label: 'Lunch', badge: 'bg-main-orange text-black' },
  { key: 'afternoon', label: 'Afternoon', badge: 'bg-main-teal text-black' },
  { key: 'dinner', label: 'Dinner', badge: 'bg-main-blue text-white' },
]

// Green-ish/amber/red readout of how close an average is to its target —
// used in the weekly history so it's a glance, not a math problem.
function macroStatusClass(actual: number, targetVal: number): string {
  if (targetVal <= 0) return 'text-neutral-500'
  const diff = Math.abs(actual - targetVal) / targetVal
  if (diff <= 0.1) return 'text-main-teal'
  if (diff <= 0.25) return 'text-main-orange'
  return 'text-main-red'
}

function dayMacros(day: Day, recipes: Recipe[], catalog: IngredientDef[]): Macros {
  const total: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  Object.values(day.slots).forEach((recipeIds) => {
    recipeIds.forEach((recipeId) => {
      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) return
      recipe.ingredients.forEach((ing) => {
        const m = estimateMacros(ing, catalog)
        total.calories += m.calories
        total.protein += m.protein
        total.carbs += m.carbs
        total.fat += m.fat
      })
    })
  })
  return {
    calories: Math.round(total.calories),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  }
}

function Calories({ recipes, weeks, ingredientCatalog, profile, onSaveProfile, onOpenRecipe }: CaloriesProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(!profile)
  const [justSavedProfile, setJustSavedProfile] = useState(false)
  const [selectedWeekId, setSelectedWeekId] = useState(weeks[0]?.id ?? '')

  const [age, setAge] = useState(profile?.age ?? 30)
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? 70)
  const [heightCm, setHeightCm] = useState(profile?.heightCm ?? 175)
  const [sex, setSex] = useState<Profile['sex']>(profile?.sex ?? 'male')
  const [activity, setActivity] = useState<Profile['activity']>(profile?.activity ?? 'moderate')
  const [goal, setGoal] = useState<Profile['goal']>(profile?.goal ?? 'maintain')
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

  const initialMacros = profile
    ? calculateMacroTargets(profile)
    : suggestedMacroTargets({ age, weightKg, heightCm, sex, activity, goal, worksOut, takesProtein })
  const [proteinTarget, setProteinTarget] = useState(String(initialMacros.protein))
  const [carbsTarget, setCarbsTarget] = useState(String(initialMacros.carbs))
  const [fatTarget, setFatTarget] = useState(String(initialMacros.fat))
  const [macrosTouched, setMacrosTouched] = useState(
    !!profile && (profile.customProtein != null || profile.customCarbs != null || profile.customFat != null),
  )

  // Macro fields auto-follow the suggested values (which depend on
  // weight/goal/activity/etc.) until the user directly edits one of them —
  // after that, their numbers are authoritative until they hit Reset.
  useEffect(() => {
    if (macrosTouched) return
    const suggested = suggestedMacroTargets({
      age,
      weightKg,
      heightCm,
      sex,
      activity,
      goal,
      worksOut,
      takesProtein,
    })
    setProteinTarget(String(suggested.protein))
    setCarbsTarget(String(suggested.carbs))
    setFatTarget(String(suggested.fat))
  }, [age, weightKg, heightCm, sex, activity, goal, worksOut, takesProtein, macrosTouched])

  function resetMacrosToSuggested() {
    setMacrosTouched(false)
  }

  // Any change to the vitals that feed the suggestion (weight, height,
  // goal, ...) makes the macro fields follow the new suggestion again,
  // even if they'd been manually overridden before — a custom value only
  // "sticks" until the next thing that would change what's suggested.
  function updateAge(value: number) {
    setAge(value)
    setMacrosTouched(false)
  }
  function updateWeightKg(value: number) {
    setWeightKg(value)
    setMacrosTouched(false)
  }
  function updateHeightCm(value: number) {
    setHeightCm(value)
    setMacrosTouched(false)
  }
  function updateSex(value: Profile['sex']) {
    setSex(value)
    setMacrosTouched(false)
  }
  function updateActivity(value: Profile['activity']) {
    setActivity(value)
    setMacrosTouched(false)
  }
  function updateGoal(value: Profile['goal']) {
    setGoal(value)
    setMacrosTouched(false)
  }
  function updateWorksOut(value: boolean) {
    setWorksOut(value)
    setMacrosTouched(false)
  }
  function updateTakesProtein(value: boolean) {
    setTakesProtein(value)
    setMacrosTouched(false)
  }

  const previewCalories = Math.round(
    (Number(proteinTarget) || 0) * 4 + (Number(carbsTarget) || 0) * 4 + (Number(fatTarget) || 0) * 9,
  )

  function saveProfile() {
    const next: Profile = {
      age,
      weightKg,
      heightCm,
      sex,
      activity,
      goal,
      worksOut,
      takesProtein,
      takesCreatine,
      customProtein: macrosTouched ? Number(proteinTarget) || 0 : undefined,
      customCarbs: macrosTouched ? Number(carbsTarget) || 0 : undefined,
      customFat: macrosTouched ? Number(fatTarget) || 0 : undefined,
      diet,
      excludedIngredients,
    }
    onSaveProfile(next)
    setIsEditingProfile(false)
    if (profile) setJustSavedProfile(true)
  }

  function cancelEditProfile() {
    if (!profile) return
    setAge(profile.age)
    setWeightKg(profile.weightKg)
    setHeightCm(profile.heightCm)
    setSex(profile.sex)
    setActivity(profile.activity)
    setGoal(profile.goal)
    setWorksOut(profile.worksOut)
    setTakesProtein(profile.takesProtein)
    setTakesCreatine(profile.takesCreatine)
    setDiet(profile.diet)
    setExcludedIngredients(profile.excludedIngredients)
    setExcludeSearch('')
    const touched = profile.customProtein != null || profile.customCarbs != null || profile.customFat != null
    setMacrosTouched(touched)
    const targets = calculateMacroTargets(profile)
    setProteinTarget(String(targets.protein))
    setCarbsTarget(String(targets.carbs))
    setFatTarget(String(targets.fat))
    setIsEditingProfile(false)
  }

  const macroTargets = profile ? calculateMacroTargets(profile) : null
  const target = macroTargets?.calories ?? null
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? weeks[0]

  return (
    <div className="py-20">
      <div className="container flex flex-col gap-30">
        <div className="flex flex-col gap-15">
          <h2 className="text-26 font-title font-bold uppercase">Calories</h2>
          <p className="text-14 font-title text-neutral-500">
            Rough estimates based on your planned recipes — not exact nutrition tracking.
          </p>

          {!isEditingProfile &&
            profile &&
            target &&
            macroTargets && (
              <div className="flex flex-wrap items-center gap-15">
                <span className="main-btn px-15 py-10 font-title font-bold bg-main-blue text-white">
                  Daily Target: {target} kcal
                </span>
                <span className="main-btn px-15 py-10 font-title font-bold">
                  P {macroTargets.protein}g · C {macroTargets.carbs}g · F {macroTargets.fat}g
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="main-btn font-title font-bold px-15 py-10"
                >
                  Edit Profile
                </button>
              </div>
            )}

          {justSavedProfile && (
            <div className="main-btn p-15 flex items-center justify-between gap-15 bg-main-yellow">
              <span className="text-14 font-title font-bold">
                Profile updated — your targets above are now current, but your planned weeks in Calendar still
                have the old picks. Go to Calendar and click "Regenerate Week" (or "Generate Week" for just the
                empty slots) to refresh them.
              </span>
              <button
                type="button"
                onClick={() => setJustSavedProfile(false)}
                aria-label="Dismiss"
                className="text-black hover:text-main-red font-bold text-16 leading-none cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {profile && target && macroTargets && selectedWeek && (
          <>
            <div className="flex flex-col gap-15">
              <div className="flex flex-wrap items-center justify-between gap-15">
                <h3 className="text-20 font-title font-bold uppercase">{selectedWeek.label} — Daily Breakdown</h3>
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="bg-white border-3 border-black pl-15 pr-30 py-10 text-14 font-title font-bold min-w-150"
                >
                  {weeks.map((week) => (
                    <option key={week.id} value={week.id}>
                      {week.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15">
                {selectedWeek.days.map((day) => {
                  const macros = dayMacros(day, recipes, ingredientCatalog)
                  const pct = Math.min(100, Math.round((macros.calories / target) * 100))
                  const over = macros.calories > target * 1.1

                  return (
                    <button
                      key={day.label}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className="main-btn p-15 flex flex-col gap-10 text-left hover:bg-neutral-50"
                    >
                      <span className="font-title font-bold uppercase text-16">{day.label}</span>
                      <span className="text-14 font-title text-neutral-500">
                        {macros.calories} / {target} kcal
                      </span>
                      <div className="w-full h-15 border-2 border-black bg-neutral-100">
                        <div
                          className={over ? 'h-full bg-main-red' : 'h-full bg-main-blue'}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-12 font-title text-neutral-500">
                        P {macros.protein}g · C {macros.carbs}g · F {macros.fat}g
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-15">
              <h3 className="text-20 font-title font-bold uppercase">History (avg / day per week)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15">
                {weeks.map((week) => {
                  const weekMacros = week.days.reduce(
                    (sum, day) => {
                      const m = dayMacros(day, recipes, ingredientCatalog)
                      return {
                        calories: sum.calories + m.calories,
                        protein: sum.protein + m.protein,
                        carbs: sum.carbs + m.carbs,
                        fat: sum.fat + m.fat,
                      }
                    },
                    { calories: 0, protein: 0, carbs: 0, fat: 0 },
                  )
                  const avg = Math.round(weekMacros.calories / 7)
                  const avgProtein = Math.round(weekMacros.protein / 7)
                  const avgCarbs = Math.round(weekMacros.carbs / 7)
                  const avgFat = Math.round(weekMacros.fat / 7)
                  return (
                    <div key={week.id} className="main-btn p-15 flex flex-col gap-5">
                      <span className="font-title font-bold uppercase">{week.label}</span>
                      <span className={`text-14 font-title font-bold ${macroStatusClass(avg, target)}`}>
                        Avg {avg} / {target} kcal
                      </span>
                      <span className="text-12 font-title">
                        <span className={`font-bold ${macroStatusClass(avgProtein, macroTargets.protein)}`}>
                          P {avgProtein}g
                        </span>
                        <span className="text-neutral-500"> · </span>
                        <span className={`font-bold ${macroStatusClass(avgCarbs, macroTargets.carbs)}`}>
                          C {avgCarbs}g
                        </span>
                        <span className="text-neutral-500"> · </span>
                        <span className={`font-bold ${macroStatusClass(avgFat, macroTargets.fat)}`}>
                          F {avgFat}g
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {isEditingProfile &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
            onClick={cancelEditProfile}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="main-btn bg-white p-30 flex flex-col gap-15 w-full max-w-[400px]"
            >
              <h2 className="text-20 font-title font-bold uppercase">
                {profile ? 'Your Profile' : 'Welcome to Food Matters'}
              </h2>
              {!profile && (
                <p className="text-14 font-title text-neutral-500 -mt-5">
                  Tell us about yourself so we can work out your daily targets and build a meal plan that fits
                  you.
                </p>
              )}

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Age</span>
                <input
                  type="number"
                  min="0"
                  value={age}
                  onChange={(e) => updateAge(Number(e.target.value))}
                  className="border-3 border-black px-10 py-5 font-title"
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Weight (kg)</span>
                <input
                  type="number"
                  min="0"
                  value={weightKg}
                  onChange={(e) => updateWeightKg(Number(e.target.value))}
                  className="border-3 border-black px-10 py-5 font-title"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Height (cm)</span>
                <input
                  type="number"
                  min="0"
                  value={heightCm}
                  onChange={(e) => updateHeightCm(Number(e.target.value))}
                  className="border-3 border-black px-10 py-5 font-title"
                />
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Sex</span>
                <select
                  value={sex}
                  onChange={(e) => updateSex(e.target.value as Profile['sex'])}
                  className="bg-white border-3 border-black pl-10 pr-30 py-5 font-title"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Activity Level</span>
                <select
                  value={activity}
                  onChange={(e) => updateActivity(e.target.value as Profile['activity'])}
                  className="bg-white border-3 border-black pl-10 pr-30 py-5 font-title"
                >
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Goal</span>
                <select
                  value={goal}
                  onChange={(e) => updateGoal(e.target.value as Profile['goal'])}
                  className="bg-white border-3 border-black pl-10 pr-30 py-5 font-title"
                >
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-10">
                <input type="checkbox" checked={worksOut} onChange={(e) => updateWorksOut(e.target.checked)} />
                <span className="text-14 font-title font-bold">I work out regularly</span>
              </label>

              <label className="flex items-center gap-10">
                <input
                  type="checkbox"
                  checked={takesProtein}
                  onChange={(e) => updateTakesProtein(e.target.checked)}
                />
                <span className="text-14 font-title font-bold">I take protein powder</span>
              </label>

              <label className="flex items-center gap-10">
                <input
                  type="checkbox"
                  checked={takesCreatine}
                  onChange={(e) => setTakesCreatine(e.target.checked)}
                />
                <span className="text-14 font-title font-bold">I take creatine</span>
              </label>
              {takesCreatine && (
                <p className="text-12 font-title text-neutral-500 -mt-5">
                  Creatine doesn't add calories or macros, but drink extra water — it pulls water into your
                  muscles.
                </p>
              )}

              <label className="flex flex-col gap-5">
                <span className="text-14 font-title font-bold">Diet</span>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value as Profile['diet'])}
                  className="bg-white border-3 border-black pl-10 pr-30 py-5 font-title"
                >
                  {DIET_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-10">
                <span className="text-14 font-title font-bold">Avoid these ingredients</span>
                <p className="text-12 font-title text-neutral-500">
                  Allergies or things you just don't want suggested — Auto-fill and Suggest other will skip
                  recipes that use them.
                </p>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search ingredients to avoid…"
                    value={excludeSearch}
                    onChange={(e) => setExcludeSearch(e.target.value)}
                    className="border-3 border-black px-10 py-5 font-title w-full"
                  />
                  {excludeSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border-3 border-t-0 border-black max-h-[180px] overflow-y-auto">
                      {excludeSuggestions.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => addExcludedIngredient(c.name)}
                          className="block w-full text-left px-10 py-5 text-14 font-title font-bold hover:bg-main-yellow"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {excludedIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-10">
                    {excludedIngredients.map((name) => (
                      <span
                        key={name}
                        className="main-btn flex items-center gap-10 px-10 py-5 text-14 font-title font-bold bg-main-red text-white"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => removeExcludedIngredient(name)}
                          aria-label={`Stop avoiding ${name}`}
                          className="text-white hover:text-black leading-none cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-10 border-t-2 border-black pt-15">
                <div className="flex items-center justify-between gap-10">
                  <span className="text-14 font-title font-bold uppercase">Macro Targets</span>
                  {macrosTouched && (
                    <button
                      type="button"
                      onClick={resetMacrosToSuggested}
                      className="text-12 font-title font-bold underline text-neutral-500 hover:text-black"
                    >
                      Reset to suggested
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-10">
                  <label className="flex flex-col gap-5">
                    <span className="text-14 font-title font-bold">Protein (g)</span>
                    <input
                      type="number"
                      min="0"
                      value={proteinTarget}
                      onChange={(e) => {
                        setProteinTarget(e.target.value)
                        setMacrosTouched(true)
                      }}
                      className="border-3 border-black px-10 py-5 font-title w-full"
                    />
                  </label>

                  <label className="flex flex-col gap-5">
                    <span className="text-14 font-title font-bold">Carbs (g)</span>
                    <input
                      type="number"
                      min="0"
                      value={carbsTarget}
                      onChange={(e) => {
                        setCarbsTarget(e.target.value)
                        setMacrosTouched(true)
                      }}
                      className="border-3 border-black px-10 py-5 font-title w-full"
                    />
                  </label>

                  <label className="flex flex-col gap-5">
                    <span className="text-14 font-title font-bold">Fat (g)</span>
                    <input
                      type="number"
                      min="0"
                      value={fatTarget}
                      onChange={(e) => {
                        setFatTarget(e.target.value)
                        setMacrosTouched(true)
                      }}
                      className="border-3 border-black px-10 py-5 font-title w-full"
                    />
                  </label>
                </div>

                <span className="text-12 font-title text-neutral-500">
                  = {previewCalories} kcal/day {macrosTouched ? '(custom)' : '(suggested from your profile)'}
                </span>
              </div>

              <div className="flex gap-10 justify-end">
                {profile && (
                  <button
                    type="button"
                    onClick={cancelEditProfile}
                    className="main-btn font-title font-bold px-15 py-10"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveProfile}
                  className="main-btn font-title font-bold bg-main-blue text-white px-15 py-10"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {selectedDay &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
            onClick={() => setSelectedDay(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="main-btn bg-white p-30 flex flex-col gap-20 w-full max-w-[420px]"
            >
              <div className="flex items-center justify-between gap-10">
                <h2 className="text-20 font-title font-bold uppercase">{selectedDay.label}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                  className="text-black hover:text-main-red font-bold text-20 leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-20">
                {SLOTS.map((slot) => {
                  const recipeIds = selectedDay.slots[slot.key]
                  return (
                    <div key={slot.key} className="flex flex-col gap-10">
                      <span
                        className={`main-btn inline-block self-start px-10 py-5 text-14 font-title font-bold uppercase ${slot.badge}`}
                      >
                        {slot.label}
                      </span>
                      {recipeIds.length === 0 ? (
                        <p className="text-14 font-title text-neutral-500">Nothing planned.</p>
                      ) : (
                        <div className="flex flex-col gap-10">
                          {recipeIds.map((recipeId, i) => {
                            const recipe = recipes.find((r) => r.id === recipeId)
                            if (!recipe) return null
                            const macros = recipeMacros(recipe, ingredientCatalog)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setSelectedDay(null)
                                  onOpenRecipe(recipe.id)
                                }}
                                className="main-btn text-left px-10 py-10 flex flex-col gap-5 hover:bg-main-yellow"
                              >
                                <span className="text-14 font-title font-bold">{recipe.title}</span>
                                <span className="text-12 font-title text-neutral-500">
                                  {Math.round(macros.calories)} kcal · P {Math.round(macros.protein)}g · C{' '}
                                  {Math.round(macros.carbs)}g · F {Math.round(macros.fat)}g
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="main-btn font-title font-bold px-15 py-10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export default Calories
