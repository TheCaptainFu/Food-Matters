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
  // visible one — the tab row on desktop, the bottom bar on phones.
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
    text: 'Σε ένα λεπτό σου δείχνω τι κάνει κάθε σελίδα και τα βασικά της κουμπιά.',
    color: 'bg-white',
  },
  {
    tab: 'today',
    target: 'today|nav-today',
    title: 'Σήμερα',
    text: 'Η αρχική σου: τι τρως σήμερα, πόσες θερμίδες έφαγες και πόσο νερό ήπιες.',
    color: 'bg-main-yellow',
  },
  {
    tab: 'today',
    target: 'today-meals',
    title: 'Τα γεύματά σου',
    text: '«✓ Το έφαγα»: το γράφει όπως ήταν στο πρόγραμμα. «Κάτι άλλο»: διαλέγεις τι έφαγες τελικά. «Δεν έφαγα»: για γεύμα που παρέλειψες. «+ Έξτρα»: κάτι παραπάνω, π.χ. ένας καφές ή ένα γλυκό.',
    color: 'bg-main-yellow',
  },
  {
    tab: 'today',
    target: 'today-water',
    title: 'Νερό',
    text: 'Κάθε «+ Ποτήρι» είναι 250ml. Ο στόχος βγαίνει από το βάρος σου και την άσκηση.',
    color: 'bg-main-teal',
  },
  {
    tab: 'calendar',
    target: 'calendar|nav-calendar',
    title: 'Πρόγραμμα',
    text: 'Η εβδομάδα σου, μέρα μέρα. Με τα ‹ › πας σε άλλη εβδομάδα.',
    color: 'bg-main-teal',
  },
  {
    tab: 'calendar',
    target: 'calendar-actions',
    title: 'Φτιάξε την εβδομάδα',
    text: '«Συμπλήρωση»: λίγες ερωτήσεις και γεμίζει μόνη της τα κενά, με βάση τον στόχο σου. «Επεξεργασία»: προσθέτεις, αλλάζεις (⇄), μετακινείς (↗) ή βγάζεις (✕) φαγητά και αλλάζεις μερίδα (×1½). «⋯»: άδειασμα ή νέο πρόγραμμα.',
    color: 'bg-main-teal',
  },
  {
    tab: 'recipes',
    target: 'recipes|nav-recipes',
    title: 'Φαγητά',
    text: 'Ελληνικές συνταγές, αλλά και καφέδες, σουβλάκια, φούρνος και σνακ. Πάτα ένα για υλικά και θερμίδες, και με «Επεξεργασία» το αλλάζεις όπως θες.',
    color: 'bg-main-orange',
  },
  {
    tab: 'recipes',
    target: 'recipes-filters',
    title: 'Βρες γρήγορα',
    text: 'Διάλεξε γεύμα με τα κουμπάκια. Στο «Φίλτρα» θα βρεις είδος (π.χ. ☕ Καφές), «Μόνο» για γρήγορα, οικονομικά, νηστίσιμα ή της εποχής, και ταξινόμηση. Ο αριθμός δείχνει πόσα φίλτρα είναι ενεργά.',
    color: 'bg-main-orange',
  },
  {
    tab: 'recipes',
    target: 'recipes-add',
    title: 'Δικό σου φαγητό',
    text: 'Με το «+» προσθέτεις κάτι δικό σου: σπιτικό με υλικά, ή κάτι απ’ έξω μόνο με θερμίδες.',
    color: 'bg-main-orange',
  },
  {
    tab: 'market',
    target: 'market|nav-market',
    title: 'Σούπερ μάρκετ',
    text: 'Η λίστα αγορών βγαίνει μόνη της από το πρόγραμμα, με τη σειρά των διαδρόμων.',
    color: 'bg-main-yellow',
  },
  {
    tab: 'market',
    target: 'market-controls',
    title: 'Στο μαγαζί',
    text: '«Από σήμερα» ή «Όλη η εβδομάδα»: για ποιες μέρες ψωνίζεις. Τσέκαρε ό,τι μπαίνει στο καλάθι. Με «+ Έξτρα» βάζεις κάτι που δεν είναι στο πρόγραμμα (π.χ. απορρυπαντικό).',
    color: 'bg-main-yellow',
  },
  {
    tab: 'market',
    target: 'leftovers|market-fridge',
    title: 'Ψυγείο',
    text: 'Γράψε τι έχεις στο ψυγείο και σου λέμε τι μπορείς να μαγειρέψεις χωρίς ψώνια.',
    color: 'bg-main-teal',
  },
  {
    tab: 'calories',
    target: 'calories|nav-calories',
    title: 'Ιστορικό',
    text: 'Πώς πήγαν οι μέρες και οι εβδομάδες σου σε σχέση με τον στόχο: μέσος όρος, σερί και πόσες μέρες κατέγραψες.',
    color: 'bg-main-orange',
  },
  {
    tab: 'calories',
    target: 'calories-fix',
    title: 'Ξέχασες κάτι;',
    text: 'Στο «Διόρθωσε μια μέρα» διαλέγεις μια περασμένη μέρα και προσθέτεις ή αλλάζεις ό,τι έφαγες.',
    color: 'bg-main-orange',
  },
  {
    tab: null,
    target: 'profile',
    title: 'Το προφίλ σου',
    text: 'Εδώ αλλάζεις στόχο, βάρος, νηστείες και ό,τι δεν τρως, και συνδέεσαι για να μη χάνεις τα δεδομένα σου.',
    color: 'bg-white',
  },
  {
    tab: 'today',
    target: 'help|help-mobile',
    title: 'Αυτό ήταν!',
    text: 'Την ξενάγηση την ξαναβρίσκεις όποτε θες στο «Βοήθεια» (το ? πάνω δεξιά στο κινητό).',
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
        const el = (step.target ?? '')
          .split('|')
          .filter(Boolean)
          .map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`))
          .find((e) => {
            const b = e?.getBoundingClientRect()
            return !!b && b.width > 0 && b.height > 0
          })
        const r = el?.getBoundingClientRect()
        setRect(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
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

  // Bring a button further down the page into view (the bottom bar and the
  // header are fixed, so they never need it).
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = (step.target ?? '')
        .split('|')
        .filter(Boolean)
        .map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`))
        .find((e) => !!e && e.getBoundingClientRect().width > 0)
      const r = el?.getBoundingClientRect()
      if (el && r && (r.top < 80 || r.bottom > window.innerHeight * 0.55)) {
        // Just under the sticky header, leaving the lower half for the card.
        window.scrollTo({ top: window.scrollY + r.top - 90, behavior: 'smooth' })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [index, step.target])

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

      {/* The card sits at the bottom — or at the top when what's lit up is
          down there (the phone's bottom bar), so it never covers it. */}
      <div
        className={`fixed inset-x-0 p-15 sm:p-20 flex justify-center ${
          rect && rect.top > window.innerHeight * 0.6 ? 'top-0' : 'bottom-0'
        }`}
      >
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
