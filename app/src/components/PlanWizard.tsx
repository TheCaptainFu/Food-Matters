import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Category } from '../types'
import { CATEGORIES } from '../types'
import { loadPlanPrefs, savePlanPrefs, type PlanPrefs } from '../recipeTraits'
import { loadHousehold, saveHousehold } from '../shopping'

type PlanWizardProps = {
  onDone: (prefs: PlanPrefs) => void
  onClose: () => void
}

// A few quick questions before "fill my week" — budget, time, what you like,
// whether you cook once for two days — answered with big taps, then the
// week is built around them. Last week's answers are pre-selected.

type StepKey = 'people' | 'budget' | 'time' | 'likes' | 'twice' | 'building'
const STEPS: StepKey[] = ['people', 'budget', 'time', 'likes', 'twice', 'building']

const STEP_BG: Record<StepKey, string> = {
  people: 'bg-main-teal',
  budget: 'bg-main-yellow',
  time: 'bg-main-teal',
  likes: 'bg-white',
  twice: 'bg-main-orange',
  building: 'bg-main-blue',
}

// Main dishes only — breakfast, fruit and sweets aren't a "what do you like
// for lunch" answer.
const LIKE_CHOICES: Category[] = ['ladera', 'legumes', 'meat', 'poultry', 'fish', 'pasta', 'pies', 'salads']

function PlanWizard({ onDone, onClose }: PlanWizardProps) {
  const [prefs, setPrefs] = useState<PlanPrefs>(loadPlanPrefs)
  const [index, setIndex] = useState(0)
  // Who eats from this plan: just you (1), or the whole household. Only
  // the shopping list and the cost scale with it — calories stay yours.
  const [people, setPeople] = useState(loadHousehold)
  const step = STEPS[index]

  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  function finish(final: PlanPrefs) {
    savePlanPrefs(final)
    saveHousehold(people)
    setIndex(STEPS.indexOf('building'))
    // A short "building" moment so the result feels made, not instant.
    window.setTimeout(() => onDone(final), 1100)
  }

  function pick(update: Partial<PlanPrefs>) {
    setPrefs((p) => ({ ...p, ...update }))
  }

  function toggleLike(category: Category) {
    setPrefs((p) => ({
      ...p,
      likes: p.likes.includes(category) ? p.likes.filter((c) => c !== category) : [...p.likes, category],
    }))
  }

  const bigChoice = (selected: boolean) =>
    `main-btn w-full flex items-center gap-15 text-left px-15 py-10 ${selected ? 'bg-black text-white' : 'bg-white'}`
  const sub = (selected: boolean) => (selected ? 'text-14 font-title text-white/80' : 'text-14 font-title text-neutral-500')
  const progress = Math.round((index / (STEPS.length - 1)) * 100)

  const choices = <K extends keyof PlanPrefs>(key: K, options: [PlanPrefs[K], string, string, string][]) => (
    <div className="flex flex-col gap-15">
      {options.map(([value, emoji, label, description]) => (
        <button key={String(value)} type="button" onClick={() => pick({ [key]: value } as Partial<PlanPrefs>)} className={bigChoice(prefs[key] === value)}>
          <span className="text-26">{emoji}</span>
          <span className="flex flex-col">
            <span className="text-16 font-title font-bold">{label}</span>
            <span className={sub(prefs[key] === value)}>{description}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const questionNumber = Math.min(index + 1, STEPS.length - 1)

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-20" onClick={step === 'building' ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_#000] w-full max-w-[460px] max-h-[90vh] flex flex-col"
      >
        {/* Header in the step's colour: name, question n of 4, close */}
        <div className={`flex items-center justify-between gap-10 px-20 py-15 border-b-3 border-black transition-colors duration-300 ${STEP_BG[step]}`}>
          <span className={`text-16 font-title font-bold uppercase ${step === 'building' ? 'text-white' : ''}`}>Φτιάξε την εβδομάδα σου</span>
          {step !== 'building' && (
            <span className="flex items-center gap-10 shrink-0">
              <span className="text-12 font-title font-bold">
                {questionNumber}/{STEPS.length - 1}
              </span>
              <button type="button" onClick={onClose} aria-label="Κλείσιμο" className="text-18 font-bold leading-none cursor-pointer">
                ✕
              </button>
            </span>
          )}
        </div>
        {step !== 'building' && (
          <div className="h-[6px] bg-neutral-200">
            <div className="h-full bg-black transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="overflow-y-auto overflow-x-hidden">
        <div key={step} className={`onb-slide px-20 py-20 flex flex-col gap-15 ${step === 'building' ? 'bg-main-blue' : ''}`}>
          {step === 'people' && (
            <>
              <h2 className="text-22 font-title font-bold uppercase leading-tight">Για ποιον είναι το πρόγραμμα;</h2>
              <div className="flex flex-col gap-15">
                <button type="button" onClick={() => setPeople(1)} className={bigChoice(people === 1)}>
                  <span className="text-26">🙋</span>
                  <span className="flex flex-col">
                    <span className="text-16 font-title font-bold">Μόνο για μένα</span>
                    <span className={sub(people === 1)}>Ψώνια και ποσότητες για ένα άτομο</span>
                  </span>
                </button>
                <button type="button" onClick={() => setPeople((n) => (n > 1 ? n : 2))} className={bigChoice(people > 1)}>
                  <span className="text-26">👨‍👩‍👧</span>
                  <span className="flex flex-col">
                    <span className="text-16 font-title font-bold">Τρώμε κι άλλοι μαζί</span>
                    <span className={sub(people > 1)}>Τα ψώνια βγαίνουν για όλους, οι θερμίδες μένουν δικές σου</span>
                  </span>
                </button>
                {people > 1 && (
                  <div className="onb-pop flex items-center justify-between gap-10 border-3 border-black bg-white px-15 py-10">
                    <span className="text-16 font-title font-bold">Πόσοι είστε μαζί με σένα;</span>
                    <span className="flex items-center border-2 border-black h-40">
                      <button
                        type="button"
                        onClick={() => setPeople((n) => Math.max(2, n - 1))}
                        aria-label="Λιγότερα άτομα"
                        className="w-40 h-full font-bold cursor-pointer hover:bg-neutral-100"
                      >
                        −
                      </button>
                      <span className="min-w-30 text-center font-title font-bold">{people}</span>
                      <button
                        type="button"
                        onClick={() => setPeople((n) => Math.min(12, n + 1))}
                        aria-label="Περισσότερα άτομα"
                        className="w-40 h-full font-bold cursor-pointer hover:bg-neutral-100"
                      >
                        +
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'budget' && (
            <>
              <h2 className="text-22 font-title font-bold uppercase leading-tight">Πώς πάμε με τα λεφτά αυτή την εβδομάδα;</h2>
              {choices('budget', [
                ['low', '🪙', 'Σφιχτά', 'Όσπρια, λαδερά, κοτόπουλο. Οικονομικά και χορταστικά'],
                ['normal', '👌', 'Κανονικά', 'Λίγο απ’ όλα, με μέτρο στα ακριβά'],
                ['any', '🤑', 'Δεν με νοιάζει', 'Και σολομός, και παϊδάκια, και γαρίδες'],
              ])}
            </>
          )}

          {step === 'time' && (
            <>
              <h2 className="text-22 font-title font-bold uppercase leading-tight">Πόσο χρόνο έχεις για μαγείρεμα τις καθημερινές;</h2>
              {choices('time', [
                ['quick', '⚡', 'Ελάχιστο', 'Μέχρι μισή ώρα. Τα μεγάλα φαγητά μένουν για το Σαββατοκύριακο'],
                ['normal', '🍳', 'Κανονικό', 'Μια ώρα είναι ΟΚ'],
                ['love', '👩‍🍳', 'Μου αρέσει να μαγειρεύω', 'Φέρε γεμιστά και γιουβέτσια και την Τρίτη'],
              ])}
            </>
          )}

          {step === 'likes' && (
            <>
              <div className="flex flex-col gap-5">
                <h2 className="text-22 font-title font-bold uppercase leading-tight">Τι σου αρέσει περισσότερο;</h2>
                <p className="text-16 font-title text-neutral-500">Διάλεξε όσα θες. Θα μπαίνουν πιο συχνά.</p>
              </div>
              <div className="flex flex-wrap gap-10">
                {LIKE_CHOICES.map((value) => {
                  const c = CATEGORIES.find((x) => x.value === value)!
                  const on = prefs.likes.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLike(value)}
                      className={`main-btn px-10 py-5 font-title font-bold text-14 ${on ? `${c.color} text-black onb-pop` : 'bg-white'}`}
                    >
                      {on ? '✓ ' : ''}
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 'twice' && (
            <>
              <h2 className="text-22 font-title font-bold uppercase leading-tight">Μαγειρεύεις κατσαρόλα για δύο μέρες;</h2>
              {choices(
                'cookTwice',
                [
                  [true, '🍲', 'Ναι, μαγειρεύω μία, τρώω δύο', 'Το βραδινό της μιας μέρας γίνεται μεσημεριανό της επόμενης'],
                  [false, '🥗', 'Όχι, κάθε μέρα κάτι φρέσκο', 'Διαφορετικό φαγητό σε κάθε γεύμα'],
                ],
              )}
            </>
          )}

          {step === 'building' && (
            <div className="flex flex-col items-center text-center gap-15 text-white py-30">
              <span className="onb-float text-[64px] leading-none" aria-hidden="true">
                🧑‍🍳
              </span>
              <h2 className="text-22 font-title font-bold uppercase">Φτιάχνω την εβδομάδα σου…</h2>
              <span className="flex gap-10" aria-hidden="true">
                <span className="onb-dot w-15 h-15 bg-white" />
                <span className="onb-dot w-15 h-15 bg-white [animation-delay:150ms]" />
                <span className="onb-dot w-15 h-15 bg-white [animation-delay:300ms]" />
              </span>
            </div>
          )}
        </div>
        </div>

        {/* Previous / Next on every question, so a wrong tap can be fixed. */}
        {step !== 'building' && (
          <div className="grid grid-cols-2 gap-10 px-20 py-15 border-t-3 border-black">
            <button
              type="button"
              onClick={index === 0 ? onClose : back}
              className="main-btn font-title font-bold py-10 bg-white"
            >
              {index === 0 ? 'Άκυρο' : '← Προηγούμενο'}
            </button>
            <button
              type="button"
              onClick={step === 'twice' ? () => finish(prefs) : next}
              className={`main-btn font-title font-bold py-10 ${step === 'twice' ? 'bg-main-yellow' : 'bg-black text-white'}`}
            >
              {step === 'twice' ? 'Φτιάξε την!' : 'Επόμενο →'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default PlanWizard
