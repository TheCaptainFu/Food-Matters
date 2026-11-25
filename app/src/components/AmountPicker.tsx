import { AMOUNTS } from '../weekUtils'

// "Πόσο έφαγες;" — Μισό / Όλο / 1½ / Διπλό as one strip of small boxes.
function AmountPicker({
  value,
  onChange,
  label = 'Πόσο;',
}: {
  value: number
  onChange: (portion: number) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-10">
      <span className="text-12 font-title font-bold uppercase text-neutral-500 shrink-0">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex border-2 border-black bg-white">
        {AMOUNTS.map((a) => {
          const on = a.value === value
          return (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(a.value)}
              className={`px-10 h-[26px] text-12 font-title font-bold cursor-pointer border-l-2 border-black first:border-l-0 transition-colors ${
                on ? 'bg-black text-white' : 'hover:bg-main-yellow'
              }`}
            >
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Next to a logged meal when it wasn't exactly one portion.
export function AmountBadge({ portion }: { portion?: number }) {
  if (!portion || portion === 1) return null
  const label = AMOUNTS.find((a) => a.value === portion)?.label ?? `×${portion}`
  return (
    <span className="inline-block ml-5 px-5 py-[1px] border-2 border-black bg-main-orange text-12 font-title font-bold uppercase whitespace-nowrap align-middle">
      {label}
    </span>
  )
}

export default AmountPicker
