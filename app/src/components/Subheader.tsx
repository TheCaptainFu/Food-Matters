export type TabKey = 'today' | 'recipes' | 'calendar' | 'market' | 'leftovers' | 'calories'

type SubheaderProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
  // Shown as a menu entry only for guests (undefined hides it).
  onSignIn?: () => void
  // Restarts the guided tour.
  onHelp: () => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Σήμερα' },
  { key: 'calendar', label: 'Πρόγραμμα' },
  { key: 'recipes', label: 'Φαγητά' },
  { key: 'market', label: 'Σούπερ μάρκετ' },
  { key: 'leftovers', label: 'Ψυγείο' },
  { key: 'calories', label: 'Ιστορικό' },
]

// Phone bottom bar: the five pages used every day, one tap each. Ψυγείο is
// linked from Today and the shopping list, help is the ? in the header and
// sign-in is in the profile.
const BOTTOM_TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'today',
    label: 'Σήμερα',
    icon: <path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" />,
  },
  {
    key: 'calendar',
    label: 'Πρόγραμμα',
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15" />
        <path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" />
      </>
    ),
  },
  {
    key: 'recipes',
    label: 'Φαγητά',
    icon: <path d="M3 11 H21 A9 9 0 0 1 3 11 Z M8 7 Q9 5 8 3 M12 7 Q13 5 12 3 M16 7 Q17 5 16 3" />,
  },
  {
    key: 'market',
    label: 'Μάρκετ',
    icon: (
      <>
        <path d="M2.5 4 H5.5 L8 15 H18.5 L20.5 7.5 H6.5" />
        <circle cx="9.5" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </>
    ),
  },
  {
    key: 'leftovers',
    label: 'Ψυγείο',
    // A fridge: two doors and their handles.
    icon: <path d="M6 3 H18 V21 H6 Z M6 10 H18 M9 6 V8 M9 13 V16" />,
  },
  {
    key: 'calories',
    label: 'Ιστορικό',
    icon: <path d="M4 20 V4 M4 20 H20 M8 16 V12 M12 16 V8 M16 16 V10" />,
  },
]

function Subheader({ activeTab, onChange, onSignIn, onHelp }: SubheaderProps) {
  return (
    <>
      {/* Desktop: a plain horizontal tab row, always visible. */}
      <div className="py-20 border-b-3 hidden tab:block">
        <ul className="container flex flex-wrap items-center gap-10 [&_li]:px-20 [&_li]:py-10 [&_li]:font-title [&_li]:text-16 [&_li]:font-bold [&_li]:uppercase">
          {TABS.map((tab) => (
            <li
              key={tab.key}
              data-tour={tab.key}
              className={activeTab === tab.key ? 'main-btn bg-main-blue text-white' : 'main-btn'}
              onClick={() => onChange(tab.key)}
            >
              {tab.label}
            </li>
          ))}
          <li data-tour="help" className="main-btn ml-auto" onClick={onHelp}>
            ❓ Βοήθεια
          </li>
          {onSignIn && (
            <li className="main-btn" onClick={onSignIn}>
              Σύνδεση
            </li>
          )}
        </ul>
      </div>

      {/* Phone: the everyday pages in a bar pinned to the bottom. */}
      <nav
        aria-label="Σελίδες"
        className="tab:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t-3 border-black pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-6">
          {BOTTOM_TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <li key={tab.key}>
                <button
                  type="button"
                  data-tour={`nav-${tab.key}`}
                  onClick={() => onChange(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex flex-col items-center gap-[3px] pt-[7px] pb-[6px] font-title font-bold text-[11px] leading-none cursor-pointer ${
                    active ? 'bg-main-blue text-white' : 'text-black'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </svg>
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

    </>
  )
}

export default Subheader
