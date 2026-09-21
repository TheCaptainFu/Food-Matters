import { createPortal } from 'react-dom'

export type TabKey = 'recipes' | 'calendar' | 'market' | 'leftovers' | 'calories'

type SubheaderProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
  isOpen: boolean
  onClose: () => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'market', label: 'Market' },
  { key: 'leftovers', label: 'Leftovers' },
  { key: 'calories', label: 'Calories' },
]

function Subheader({ activeTab, onChange, isOpen, onClose }: SubheaderProps) {
  return (
    <>
      {/* Desktop: a plain horizontal tab row, always visible. */}
      <div className="py-20 border-b-3 hidden tab:block">
        <ul className="container flex flex-wrap items-center gap-10 [&_li]:px-20 [&_li]:py-10 [&_li]:font-title [&_li]:text-16 [&_li]:font-bold [&_li]:uppercase">
          {TABS.map((tab) => (
            <li
              key={tab.key}
              className={activeTab === tab.key ? 'main-btn bg-main-blue text-white' : 'main-btn'}
              onClick={() => onChange(tab.key)}
            >
              {tab.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile: a full-screen white takeover, opened by the burger button —
          menu centered in the middle, close button pinned top-right. */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 bg-white z-50 tab:hidden flex flex-col">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="main-btn font-title font-bold text-20 w-40 h-40 flex items-center justify-center absolute top-50 right-20"
            >
              ✕
            </button>

            <ul className="flex-1 flex flex-col items-center justify-center gap-15 px-20 [&_li]:w-full [&_li]:max-w-[300px] [&_li]:px-20 [&_li]:py-15 [&_li]:font-title [&_li]:text-18 [&_li]:font-bold [&_li]:uppercase [&_li]:text-center">
              {TABS.map((tab) => (
                <li
                  key={tab.key}
                  className={activeTab === tab.key ? 'main-btn bg-main-blue text-white' : 'main-btn'}
                  onClick={() => onChange(tab.key)}
                >
                  {tab.label}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}

export default Subheader
