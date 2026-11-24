import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TabKey } from './Subheader'

type TourGuideProps = {
  onNavigate: (tab: TabKey) => void
  onPlanWeek: () => void
  onClose: () => void
}

// A short guided tour right after the welcome: it opens each page in turn,
// lights up where that page lives, and says in one or two lines what it's
// for and the one thing to press there.

type TourStep = {
  // Which page to show behind the card (null = stay where we are).
  tab: TabKey | null
  // What to light up: a [data-tour="…"] element, or "a|b" for the first
  // visible of two — tabs on desktop, the ☰ menu on phones (where tabs hide).
  target?: string
  title: string
  text: string
  tip?: string
  color: string
}

const STEPS: TourStep[] = [
  {
    tab: 'today',
    title: 'Μια γρήγορη βόλτα;',
    text: 'Σε 30 δευτερόλεπτα σου δείχνω τι κάνει κάθε σελίδα, για να μη χαθείς.',
    color: 'bg-white',
  },
  {
    tab: 'today',
    target: 'today|menu',
    title: 'Σήμερα',
    text: 'Η αρχική σου. Τι τρως σήμερα, πόσες θερμίδες έχεις φάει, πόσο νερό ήπιες.',
    tip: 'Όταν τρως κάτι, πάτα «✓ Το έφαγα».',
    color: 'bg-main-yellow',
  },
  {
    tab: 'calendar',
    target: 'calendar|menu',
    title: 'Πρόγραμμα',
    text: 'Η εβδομάδα σου, μέρα μέρα. Με τα ‹ › πας σε άλλη εβδομάδα.',
    tip: 'Πάτα «Συμπλήρωση» και τη φτιάχνουμε μαζί. Με «Επεξεργασία» αλλάζεις ό,τι θες.',
    color: 'bg-main-teal',
  },
  {
    tab: 'recipes',
    target: 'recipes|menu',
    title: 'Συνταγές',
    text: 'Όλες οι ελληνικές συνταγές, με φίλτρα ανά γεύμα και είδος. Πάτα μία για υλικά και εκτέλεση.',
    tip: 'Με το «+» προσθέτεις τη δική σου.',
    color: 'bg-main-orange',
  },
  {
    tab: 'market',
    target: 'market|menu',
    title: 'Σούπερ μάρκετ',
    text: 'Η λίστα αγορών βγαίνει μόνη της από το πρόγραμμα, με τη σειρά των διαδρόμων.',
    tip: 'Στο μαγαζί τσεκάρεις ό,τι μπαίνει στο καλάθι.',
    color: 'bg-main-yellow',
  },
  {
    tab: 'leftovers',
    target: 'leftovers|menu',
    title: 'Ψυγείο',
    text: 'Γράψε τι έχεις στο ψυγείο και σου λέμε τι μπορείς να μαγειρέψεις, χωρίς ψώνια.',
    color: 'bg-main-teal',
  },
  {
    tab: 'calories',
    target: 'calories|menu',
    title: 'Ιστορικό',
    text: 'Πώς πήγαν οι μέρες και οι εβδομάδες σου σε σχέση με τον στόχο. Ξέχασες να γράψεις κάτι χθες; Το διορθώνεις εδώ.',
    color: 'bg-main-orange',
  },
  {
    tab: null,
    target: 'profile',
    title: 'Το προφίλ σου',
    text: 'Εδώ αλλάζεις στόχο, βάρος, νηστείες και ό,τι δεν τρως.',
    color: 'bg-white',
  },
  {
    tab: 'today',
    target: 'help|menu',
    title: 'Αυτό ήταν!',
    text: 'Την ξενάγηση την ξαναβρίσκεις όποτε θες στο «Βοήθεια» του μενού.',
    tip: 'Πάμε να φτιάξουμε την πρώτη σου εβδομάδα;',
    color: 'bg-main-blue',
  },
]

type Rect = { top: number; left: number; width: number; height: number }

function TourGuide({ onNavigate, onPlanWeek, onClose }: TourGuideProps) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = STEPS[index]
  const isLast = index === STEPS.length - 1

  // Measure the lit-up element after the page behind has switched, and
  // keep following it on resize/scroll.
  useLayoutEffect(() => {
    let frame = 0
    const measure = () => {
      frame = requestAnimationFrame(() => {
        // "a|b": the first one that's visible (desktop tab vs phone menu).
        const r = (step.target ?? '')
          .split('|')
          .filter(Boolean)
          .map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`)?.getBoundingClientRect())
          .find((b) => b && b.width > 0 && b.height > 0)
        setRect(r && r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
      })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target, index])

  function go(to: number) {
    const target = STEPS[to]
    if (target.tab) onNavigate(target.tab)
    setIndex(to)
  }

  const pad = 6
  const textColor = step.color === 'bg-main-blue' ? 'text-white' : 'text-black'

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Ξενάγηση">
      {/* Dimmed page with a "hole" around the lit-up element */}
      {rect ? (
        <div
          className="fixed border-3 border-main-yellow transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/55" />
      )}

      {/* The card, always at the bottom so it never covers the lit-up tab */}
      <div className="fixed inset-x-0 bottom-0 p-15 sm:p-20 flex justify-center">
        <div
          key={index}
          className={`onb-rise w-full max-w-[460px] border-3 border-black shadow-[6px_6px_0_0_#000] p-20 flex flex-col gap-15 ${step.color} ${textColor}`}
        >
          {/* Title, a short text, then the two buttons — nothing else. */}
          <div className="flex items-start justify-between gap-10">
            <h2 className="text-22 font-title font-bold uppercase">{step.title}</h2>
            <span className="flex items-center gap-10 shrink-0">
              <span className="text-12 font-title font-bold opacity-70">
                {index + 1}/{STEPS.length}
              </span>
              <button type="button" onClick={onClose} aria-label="Τέλος ξενάγησης" className="text-18 font-bold leading-none cursor-pointer">
                ✕
              </button>
            </span>
          </div>
          <p className="text-16 font-title -mt-5">
            {step.text}
            {step.tip ? ` ${step.tip}` : ''}
          </p>

          <div className="grid grid-cols-2 gap-10">
            {index === 0 ? (
              <>
                <button type="button" onClick={onClose} className="main-btn font-title font-bold py-10 bg-white text-black">
                  Όχι τώρα
                </button>
                <button type="button" onClick={() => go(1)} className="main-btn font-title font-bold py-10 bg-black text-white">
                  Πάμε →
                </button>
              </>
            ) : isLast ? (
              <>
                <button type="button" onClick={() => go(index - 1)} className="main-btn font-title font-bold py-10 bg-white text-black">
                  ← Πίσω
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onPlanWeek()
                  }}
                  className="main-btn font-title font-bold py-10 bg-main-yellow text-black"
                >
                  Φτιάξε την εβδομάδα
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => go(index - 1)} className="main-btn font-title font-bold py-10 bg-white text-black">
                  ← Πίσω
                </button>
                <button type="button" onClick={() => go(index + 1)} className="main-btn font-title font-bold py-10 bg-black text-white">
                  Επόμενο →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default TourGuide
