import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Logo from './Logo'
import { ACTIVITY_LEVELS, GOALS, PACES, calculateWaterTargetMl, normalizeProfile, paceHint, suggestedMacroTargets } from '../nutrition'
import { DIET_TYPES, type DietType } from '../dietaryRestrictions'
import type { IngredientDef } from '../types'
import type { ActivityLevel, Goal, Pace, Profile, Sex } from '../nutrition'
import BrutalIcon, { type BrutalIconName } from './BrutalIcon'
import { HEALTH_CONDITIONS, type HealthCondition } from '../healthConditions'
import { plainText } from '../text'

type OnboardingProps = {
  ingredientCatalog: IngredientDef[]
  onFinish: (profile: Profile) => void
  onSkip: () => void
}

// The welcome for a brand-new visitor: one playful question per screen, each
// in its own colour, with big tap targets that move on by themselves — and
// the daily target counting up at the end.

// Same choices, labels and descriptions as the profile — only the icons
// are extra here.
const ACTIVITY_ICONS: Record<ActivityLevel, BrutalIconName> = {
  sedentary: 'sofa',
  light: 'shoe',
  moderate: 'heart',
  active: 'flame',
  very_active: 'star',
}
const ACTIVITY_CHOICES = ACTIVITY_LEVELS.map((a) => ({ ...a, icon: ACTIVITY_ICONS[a.value] }))

const GOAL_ICONS: Record<Goal, BrutalIconName> = { lose: 'down', maintain: 'scale', gain: 'up' }
const GOAL_CHOICES = GOALS.map((g) => ({ ...g, icon: GOAL_ICONS[g.value] }))

type StepKey = 'welcome' | 'sex' | 'body' | 'goal' | 'activity' | 'extras' | 'diet' | 'result'
const STEPS: StepKey[] = ['welcome', 'sex', 'body', 'goal', 'activity', 'extras', 'diet', 'result']

// Background per step — the brand colours, so every screen feels different.
const STEP_BG: Record<StepKey, string> = {
  welcome: 'bg-white',
  sex: 'bg-main-teal',
  body: 'bg-white',
  goal: 'bg-main-orange',
  activity: 'bg-main-teal',
  extras: 'bg-main-yellow',
  diet: 'bg-white',
  result: 'bg-main-blue',
}

function Stepper({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-baseline justify-between">
        <span className="text-16 font-title font-bold uppercase">{label}</span>
        <span className="font-title">
          <span key={value} className="onb-pop inline-block text-36 font-bold leading-none">
            {value}
          </span>
          <span className="text-16 text-neutral-500"> {unit}</span>
        </span>
      </div>
      <div className="flex items-center gap-10">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`${label} −1`}
          className="main-btn shrink-0 w-40 h-40 font-bold text-20 bg-white"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="onb-range flex-1"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`${label} +1`}
          className="main-btn shrink-0 w-40 h-40 font-bold text-20 bg-white"
        >
          +
        </button>
      </div>
    </div>
  )
}

// Counts up from 0 to the target, for the reveal at the end.
function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    let frame = 0
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, run])
  return value
}

const plain = plainText

function Onboarding({ ingredientCatalog, onFinish, onSkip }: OnboardingProps) {
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const [sex, setSex] = useState<Sex | null>(null)
  const [age, setAge] = useState(30)
  const [weight, setWeight] = useState(70)
  const [height, setHeight] = useState(170)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [pace, setPace] = useState<Pace>('normal')
  const [activity, setActivity] = useState<ActivityLevel | null>(null)
  const [worksOut, setWorksOut] = useState(false)
  const [observesFasting, setObservesFasting] = useState(false)
  const [takesProtein, setTakesProtein] = useState(false)
  const [takesCreatine, setTakesCreatine] = useState(false)
  const [diet, setDiet] = useState<DietType>('none')
  const [excluded, setExcluded] = useState<string[]>([])
  const [conditions, setConditions] = useState<HealthCondition[]>([])
  const [excludeSearch, setExcludeSearch] = useState('')
  const excludeSuggestions =
    excludeSearch.trim().length === 0
      ? []
      : ingredientCatalog
          .filter((c) => plain(c.name).includes(plain(excludeSearch.trim())) && !excluded.includes(c.name))
          .slice(0, 6)

  const vitals = {
    age,
    weightKg: weight,
    heightCm: height,
    sex: sex ?? 'female',
    activity: activity ?? 'moderate',
    goal: goal ?? 'maintain',
    pace,
    worksOut,
  }
  const targets = suggestedMacroTargets(vitals)
  const waterL = (calculateWaterTargetMl({ weightKg: weight, worksOut }) / 1000).toFixed(1)
  const shownCalories = useCountUp(targets.calories, step === 'result')

  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  function finish() {
    onFinish(normalizeProfile({ ...vitals, observesFasting, takesProtein, takesCreatine, diet, excludedIngredients: excluded, conditions }))
  }

  const bigChoice = (selected: boolean) =>
    `main-btn w-full flex items-center gap-15 text-left px-20 py-15 ${selected ? 'bg-black text-white' : 'bg-white'}`

  // Every screen moves on with "Συνέχεια", so a wrong tap can be fixed;
  // choice screens need an answer first.
  const canContinue =
    (step !== 'sex' || sex !== null) && (step !== 'goal' || goal !== null) && (step !== 'activity' || activity !== null)
  const progress = Math.round((index / (STEPS.length - 1)) * 100)

  return createPortal(
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${STEP_BG[step]}`}>
      {/* Top bar: back, progress, skip — not on the welcome screen */}
      {step !== 'welcome' && (
      <div className="flex items-center gap-15 px-20 pt-20 max-w-[520px] w-full mx-auto">
        <div className="flex-1 h-[10px] border-2 border-black bg-white">
          <div className="h-full bg-black transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <button type="button" onClick={onSkip} className="text-14 font-title font-bold underline cursor-pointer">
          Αργότερα
        </button>
      </div>
      )}

      {/* One screen per step; the key restarts the slide-in animation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div key={step} className="onb-slide max-w-[520px] w-full mx-auto px-20 py-30 flex flex-col gap-25 min-h-full justify-center">
          {step === 'welcome' && (
            <div className="flex flex-col items-center text-center gap-25">
              <Logo className="text-52 text-center" />
              <p className="text-20 font-title max-w-[380px]">
                Η εφαρμογή που σου λέει <span className="font-bold">τι να μαγειρέψεις</span>,{' '}
                <span className="font-bold">τι να αγοράσεις</span> και <span className="font-bold">πόσο να τρως</span>, με
                ελληνικές συνταγές.
              </p>
              <ul className="flex flex-col gap-10 w-full max-w-[380px] text-left">
                {(
                  [
                    ['bg-main-yellow', 'Πρόγραμμα', 'Η εβδομάδα σου γεμίζει με ελληνικά φαγητά που ταιριάζουν στον στόχο σου.'],
                    ['bg-main-teal', 'Λίστα αγορών', 'Βγαίνει μόνη της, ανά διάδρομο του σούπερ μάρκετ.'],
                    ['bg-main-orange', 'Ιστορικό', 'Γράφεις τι έφαγες με ένα πάτημα και βλέπεις πώς πας.'],
                  ] as const
                ).map(([color, title, text], i) => (
                  <li
                    key={title}
                    className="onb-rise flex gap-15 items-start border-3 border-black bg-white shadow-[4px_4px_0_0_#000] px-15 py-10"
                    style={{ animationDelay: `${200 + i * 120}ms` }}
                  >
                    <span className={`w-15 h-15 shrink-0 mt-5 border-2 border-black ${color}`} />
                    <span className="flex flex-col">
                      <span className="text-16 font-title font-bold uppercase">{title}</span>
                      <span className="text-14 font-title text-neutral-600">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col items-center gap-10 w-full max-w-[380px]">
                <button type="button" onClick={next} className="main-btn w-full py-15 bg-black text-white font-title font-bold text-20 uppercase">
                  Πάμε! →
                </button>
                <span className="text-14 font-title text-neutral-500">
                  Πρώτα, λίγα στοιχεία για σένα. Θέλει ένα λεπτό και μένουν μόνο στο κινητό σου.
                </span>
                <button type="button" onClick={onSkip} className="text-14 font-title font-bold underline cursor-pointer">
                  Αργότερα
                </button>
              </div>
            </div>
          )}

          {step === 'sex' && (
            <>
              <h2 className="text-32 font-title font-bold uppercase leading-tight">Ποιος/ποια είσαι;</h2>
              <div className="grid grid-cols-2 gap-15">
                {(
                  [
                    ['female', 'woman', 'Γυναίκα'],
                    ['male', 'man', 'Άνδρας'],
                  ] as const
                ).map(([value, emoji, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSex(value)}
                    className={`main-btn flex flex-col items-center gap-10 py-30 ${sex === value ? 'bg-black text-white' : 'bg-white'}`}
                  >
                    <BrutalIcon name={emoji} size={72} />
                    <span className="text-20 font-title font-bold">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-14 font-title text-black/60">Το χρειαζόμαστε μόνο για τον υπολογισμό των θερμίδων.</p>
            </>
          )}

          {step === 'body' && (
            <>
              <div className="flex flex-col gap-5">
                <h2 className="text-32 font-title font-bold uppercase leading-tight">Λίγα νούμερα</h2>
                <p className="text-16 font-title text-neutral-500">Μένουν μεταξύ μας.</p>
              </div>
              <div className="flex flex-col gap-25">
                <Stepper label="Ηλικία" unit="χρονών" value={age} min={14} max={90} onChange={setAge} />
                <Stepper label="Βάρος" unit="kg" value={weight} min={35} max={200} onChange={setWeight} />
                <Stepper label="Ύψος" unit="cm" value={height} min={130} max={215} onChange={setHeight} />
              </div>
            </>
          )}

          {step === 'goal' && (
            <>
              <h2 className="text-32 font-title font-bold uppercase leading-tight">Τι θέλεις να πετύχεις;</h2>
              <div className="flex flex-col gap-15">
                {GOAL_CHOICES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={bigChoice(goal === g.value)}
                  >
                    <BrutalIcon name={g.icon} size={44} />
                    <span className="flex flex-col">
                      <span className="text-20 font-title font-bold">{g.label}</span>
                      <span className={goal === g.value ? 'text-14 font-title text-white/80' : 'text-14 font-title text-neutral-500'}>
                        {g.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {/* Losing or gaining needs a pace before moving on. */}
              {/* Space is kept for it even when hidden, so picking a goal
                  doesn't shift the choices above. */}
              {(
                <div
                  aria-hidden={!goal || goal === 'maintain'}
                  className={goal && goal !== 'maintain' ? 'onb-slide flex flex-col gap-10' : 'invisible flex flex-col gap-10'}
                >
                  <span className="text-16 font-title font-bold uppercase">Με τι ρυθμό;</span>
                  <div className="grid grid-cols-3 gap-10">
                    {PACES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPace(p.value)}
                        className={`main-btn py-10 font-title font-bold ${pace === p.value ? 'bg-black text-white' : 'bg-white'}`}
                      >
                                                {p.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-14 font-title text-black/70">{goal ? paceHint(goal, pace) : ''}</span>
                </div>
              )}
            </>
          )}

          {step === 'activity' && (
            <>
              <h2 className="text-32 font-title font-bold uppercase leading-tight">Πόσο κινείσαι;</h2>
              <div className="flex flex-col gap-15">
                {ACTIVITY_CHOICES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivity(a.value)}
                    className={bigChoice(activity === a.value)}
                  >
                    <BrutalIcon name={a.icon} size={44} />
                    <span className="flex flex-col">
                      <span className="text-20 font-title font-bold">{a.label}</span>
                      <span className={activity === a.value ? 'text-14 font-title text-white/80' : 'text-14 font-title text-neutral-500'}>
                        {a.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'extras' && (
            <>
              <div className="flex flex-col gap-5">
                <h2 className="text-32 font-title font-bold uppercase leading-tight">Προπόνηση & συμπληρώματα</h2>
                <p className="text-16 font-title text-black/60">Διάλεξε όσα ισχύουν, ή κανένα.</p>
              </div>
              <div className="flex flex-col gap-15">
                {(
                  [
                    [worksOut, setWorksOut, 'dumbbell', 'Προπόνηση με βάρη', 'Κάνω βάρη τακτικά. Ανεβάζει τον στόχο πρωτεΐνης και νερού.'],
                    [takesProtein, setTakesProtein, 'drumstick', 'Σκόνη πρωτεΐνης', 'Το πρόγραμμα προτείνει σέικ τις μέρες που λείπει πρωτεΐνη.'],
                    [takesCreatine, setTakesCreatine, 'drop', 'Κρεατίνη', 'Δεν έχει θερμίδες, αλλά πίνε περισσότερο νερό.'],
                  ] as const
                ).map(([checked, set, icon, label, hint]) => (
                  <button
                    key={label}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => set(!checked)}
                    className={bigChoice(checked)}
                  >
                    <BrutalIcon name={icon} size={44} />
                    <span className="flex flex-col flex-1">
                      <span className="text-20 font-title font-bold">{label}</span>
                      <span className={checked ? 'text-14 font-title text-white/80' : 'text-14 font-title text-neutral-500'}>{hint}</span>
                    </span>
                    <span
                      className={
                        checked
                          ? 'onb-pop w-30 h-30 shrink-0 border-3 border-white bg-white text-black font-bold flex items-center justify-center'
                          : 'w-30 h-30 shrink-0 border-3 border-black bg-white'
                      }
                    >
                      {checked && '✓'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'diet' && (
            <>
              <div className="flex flex-col gap-5">
                <h2 className="text-32 font-title font-bold uppercase leading-tight">Πώς τρως;</h2>
                <p className="text-16 font-title text-black/60">Για να σου προτείνουμε μόνο ό,τι τρως.</p>
              </div>
              <div className="flex flex-col gap-10">
                <span className="text-16 font-title font-bold uppercase">Διατροφή</span>
                <div className="grid grid-cols-3 gap-10">
                  {DIET_TYPES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDiet(d.value)}
                      className={`main-btn py-10 px-10 font-title font-bold ${diet === d.value ? 'bg-black text-white' : 'bg-white'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-15">
                {(
                  [
                    [observesFasting, setObservesFasting, 'cross', 'Τηρώ τις νηστείες', 'Σαρακοστή, Δεκαπενταύγουστος, Τετάρτη και Παρασκευή… Εκείνες τις μέρες μόνο νηστίσιμα.'],
                  ] as const
                ).map(([checked, set, icon, label, hint]) => (
                  <button
                    key={label}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => set(!checked)}
                    className={bigChoice(checked)}
                  >
                    <BrutalIcon name={icon} size={44} />
                    <span className="flex flex-col flex-1">
                      <span className="text-20 font-title font-bold">{label}</span>
                      <span className={checked ? 'text-14 font-title text-white/80' : 'text-14 font-title text-neutral-500'}>{hint}</span>
                    </span>
                    <span
                      className={
                        checked
                          ? 'onb-pop w-30 h-30 shrink-0 border-3 border-white bg-white text-black font-bold flex items-center justify-center'
                          : 'w-30 h-30 shrink-0 border-3 border-black bg-white'
                      }
                    >
                      {checked && '✓'}
                    </span>
                  </button>
                ))}
              </div>
              {/* Health: small on/off boxes, so this step doesn't grow long. */}
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-5">
                  <span className="text-16 font-title font-bold uppercase">Υγεία</span>
                  <span className="text-14 font-title text-neutral-500">Ό,τι ισχύει για σένα. Προαιρετικό.</span>
                </div>
                <div className="flex flex-wrap gap-10">
                  {HEALTH_CONDITIONS.map((c) => {
                    const on = conditions.includes(c.value)
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        title={c.hint}
                        onClick={() => setConditions((prev) => (on ? prev.filter((x) => x !== c.value) : [...prev, c.value]))}
                        className={`main-btn px-10 py-5 font-title font-bold text-14 ${on ? 'bg-black text-white' : 'bg-white'}`}
                      >
                        {on ? '✓ ' : ''}
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-5">
                  <span className="text-16 font-title font-bold uppercase">Υλικά που αποφεύγεις</span>
                  <span className="text-14 font-title text-neutral-500">Αλλεργίες ή πράγματα που δεν σου αρέσουν. Προαιρετικό.</span>
                </div>
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Πρόσθεσε υλικό, π.χ. καρύδια…"
                    value={excludeSearch}
                    onChange={(e) => setExcludeSearch(e.target.value)}
                    className="w-full border-3 border-black bg-white px-15 py-10 text-16 font-title outline-none focus:shadow-[4px_4px_0_0_#000]"
                  />
                  {excludeSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border-3 border-t-0 border-black shadow-[4px_4px_0_0_#000] max-h-[220px] overflow-y-auto">
                      {excludeSuggestions.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            setExcluded((prev) => [...prev, c.name])
                            setExcludeSearch('')
                          }}
                          className="flex w-full items-center justify-between gap-10 text-left px-15 py-10 text-16 font-title font-bold hover:bg-main-yellow border-b border-neutral-200 last:border-b-0 cursor-pointer"
                        >
                          {c.name}
                          <span className="text-14 font-normal text-neutral-500">+ Αποφυγή</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {excluded.length > 0 && (
                  <div className="flex flex-wrap gap-10">
                    {excluded.map((name) => (
                      <span key={name} className="flex items-center gap-10 pl-10 pr-5 py-5 text-14 font-title font-bold bg-main-red/20 border-2 border-black">
                        🚫 {name}
                        <button
                          type="button"
                          onClick={() => setExcluded((prev) => prev.filter((n) => n !== name))}
                          aria-label={`Αφαίρεση: ${name}`}
                          className="w-20 h-20 flex items-center justify-center leading-none hover:bg-black hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'result' && (
            <div className="flex flex-col items-center text-center gap-20 text-white">
              <span className="onb-confetti" aria-hidden="true">
                <BrutalIcon name="star" size={64} />
              </span>
              <h2 className="text-26 font-title font-bold uppercase">Ο αριθμός σου είναι</h2>
              <div className="onb-pop bg-main-yellow text-black border-3 border-black shadow-[6px_6px_0_0_#000] px-30 py-20 flex flex-col items-center">
                <span className="text-[72px] font-title font-bold leading-none tabular-nums">{shownCalories}</span>
                <span className="text-16 font-title font-bold uppercase">θερμίδες τη μέρα</span>
              </div>
              <div className="grid grid-cols-4 gap-10 w-full">
                {(
                  [
                    ['drumstick', `${targets.protein}g`, 'Πρωτεΐνη'],
                    ['pasta', `${targets.carbs}g`, 'Υδατ.'],
                    ['olive', `${targets.fat}g`, 'Λιπαρά'],
                    ['drop', `${waterL}L`, 'Νερό'],
                  ] as const
                ).map(([emoji, value, label], i) => (
                  <div
                    key={label}
                    className="onb-rise bg-white text-black border-3 border-black py-10 flex flex-col items-center"
                    style={{ animationDelay: `${900 + i * 120}ms` }}
                  >
                    <BrutalIcon name={emoji} size={28} />
                    <span className="text-16 font-title font-bold">{value}</span>
                    <span className="text-12 font-title text-neutral-500">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-16 font-title">
                {goal === 'lose'
                  ? 'Θα σου προτείνω χορταστικά πιάτα που σε βοηθούν να χάνεις κιλά χωρίς να πεινάς.'
                  : goal === 'gain'
                    ? 'Θα σου προτείνω πιάτα με αρκετή ενέργεια και πρωτεΐνη.'
                    : 'Θα σου προτείνω πιάτα που σε κρατάνε σε ισορροπία.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action (the welcome screen has its own, under the cards) */}
      {step !== 'welcome' && (
      <div className="px-20 pb-30 pt-10 max-w-[520px] w-full mx-auto">
        {step === 'result' ? (
          <div className="grid grid-cols-[auto_1fr] gap-10">
            <button type="button" onClick={back} className="main-btn py-15 px-20 bg-white font-title font-bold text-20 uppercase">
              ←<span className="hidden sm:inline"> Πίσω</span>
            </button>
            <button type="button" onClick={finish} className="main-btn w-full py-15 bg-main-yellow font-title font-bold text-20 uppercase">
              Ξεκινάμε! →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-10">
            <button
              type="button"
              onClick={back}
              className="main-btn py-15 px-20 bg-white font-title font-bold text-20 uppercase"
            >
              ←<span className="hidden sm:inline"> Πίσω</span>
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="main-btn w-full py-15 bg-black text-white font-title font-bold text-20 uppercase disabled:opacity-30 disabled:pointer-events-none"
            >
              Συνέχεια →
            </button>
          </div>
        )}
      </div>
      )}
    </div>,
    document.body,
  )
}

export default Onboarding
