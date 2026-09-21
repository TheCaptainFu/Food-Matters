import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import type { IngredientDef } from '../types'
import { calculateMacroTargets, suggestedMacroTargets, ACTIVITY_LEVELS, GOALS } from '../nutrition'
import type { Profile } from '../nutrition'
import { DIET_TYPES } from '../dietaryRestrictions'
import { signOut } from '../useAuth'

type ProfileModalProps = {
  profile: Profile | null
  ingredientCatalog: IngredientDef[]
  user: User | null
  onSaveProfile: (profile: Profile) => void
  onClose: () => void
}

type TabKey = 'vitals' | 'activity' | 'diet' | 'macros'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'vitals', label: 'Vitals' },
  { key: 'activity', label: 'Activity' },
  { key: 'diet', label: 'Diet' },
  { key: 'macros', label: 'Macros' },
]

function ProfileModal({ profile, ingredientCatalog, user, onSaveProfile, onClose }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('vitals')
  const [justSavedProfile, setJustSavedProfile] = useState(false)

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
    const suggested = suggestedMacroTargets({ age, weightKg, heightCm, sex, activity, goal, worksOut, takesProtein })
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
    if (profile) {
      setJustSavedProfile(true)
    } else {
      onClose()
    }
  }

  // New users can't dismiss without saving — there's nothing to fall back
  // to. Returning users can close freely; their saved profile is untouched
  // until they hit Save.
  function handleBackdropClick() {
    if (profile) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20" onClick={handleBackdropClick}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="main-btn bg-white p-30 flex flex-col gap-20 w-full max-w-[440px] max-h-[85vh] overflow-y-auto"
      >
        {user && (
          <div className="flex items-center gap-15 pb-15 border-b-2 border-black">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-40 h-40 border-2 border-black object-cover shrink-0"
              />
            )}
            <span className="flex-1 flex flex-col min-w-0">
              <span className="text-14 font-title font-bold truncate">
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <span className="text-12 font-title text-neutral-500 truncate">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="main-btn font-title font-bold text-12 px-10 py-5 shrink-0"
            >
              Sign out
            </button>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <h2 className="text-20 font-title font-bold uppercase">{profile ? 'Your Profile' : 'Welcome to Food Matters'}</h2>
          {!profile && (
            <p className="text-14 font-title text-neutral-500">
              Tell us about yourself so we can work out your daily targets and build a meal plan that fits you.
            </p>
          )}
        </div>

        {justSavedProfile && (
          <div className="main-btn p-15 flex items-center justify-between gap-15 bg-main-yellow">
            <span className="text-14 font-title font-bold">
              Profile updated — your targets are now current, but your planned weeks in Calendar still have the
              old picks. Go to Calendar and click "Regenerate Week" to refresh them.
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

        <div className="flex flex-wrap gap-10">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? 'main-btn font-title font-bold text-12 uppercase px-10 py-5 bg-main-blue text-white'
                  : 'main-btn font-title font-bold text-12 uppercase px-10 py-5'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'vitals' && (
          <div className="flex flex-col gap-15">
            <label className="flex flex-col gap-5">
              <span className="text-14 font-title font-bold">Age</span>
              <input
                type="number"
                min="0"
                value={age}
                onChange={(e) => updateAge(Number(e.target.value))}
                className="border-3 border-black px-10 py-5 font-title"
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
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col gap-15">
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
              <input type="checkbox" checked={takesCreatine} onChange={(e) => setTakesCreatine(e.target.checked)} />
              <span className="text-14 font-title font-bold">I take creatine</span>
            </label>
            {takesCreatine && (
              <p className="text-12 font-title text-neutral-500 -mt-5">
                Creatine doesn't add calories or macros, but drink extra water — it pulls water into your muscles.
              </p>
            )}
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="flex flex-col gap-15">
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
                Allergies or things you just don't want suggested — Auto-fill and Suggest other will skip recipes
                that use them.
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
          </div>
        )}

        {activeTab === 'macros' && (
          <div className="flex flex-col gap-10">
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
        )}

        <div className="flex gap-10 justify-end">
          {profile && (
            <button type="button" onClick={onClose} className="main-btn font-title font-bold px-15 py-10">
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
  )
}

export default ProfileModal
