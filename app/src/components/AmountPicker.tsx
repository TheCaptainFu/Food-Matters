import { AMOUNTS } from '../weekUtils'

// "Πόσο έφαγες;" — ×½ / ×1 / ×1½ / ×2 as one strip of small boxes.
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

// One small box with just the current amount; each tap moves to the next
// (×½ → ×1 → ×1½ → ×2 → ×½). Orange when it isn't one portion. At ×1 it
// stays out of sight and appears only while hovering / tapping the row
// (the row needs the `group` class). It keeps its place while invisible and
// is no taller than the text, so the row never jumps in height.
export function AmountCycle({ portion, onChange }: { portion?: number; onChange: (portion: number) => void }) {
  const current = portion ?? 1
  const index = AMOUNTS.findIndex((a) => a.value === current)
  const next = AMOUNTS[(index + 1) % AMOUNTS.length]
  const label = AMOUNTS[index]?.label ?? `×${current}`
  return (
    <button
      type="button"
      onClick={() => onChange(next.value)}
      title={`Μερίδες που έφαγες — πάτα για ${next.label}`}
      aria-label={`Μερίδες: ${label}. Πάτα για ${next.label}`}
      className={`inline-block shrink-0 ml-5 px-5 py-0 leading-[14px] border-2 border-black text-12 font-title font-bold whitespace-nowrap align-middle cursor-pointer hover:bg-main-yellow ${
        current === 1
          ? 'invisible group-hover:visible focus:visible bg-white'
          : 'bg-main-orange'
      }`}
    >
      {label}
    </button>
  )
}

// Next to a logged meal when it wasn't exactly one portion.
export function AmountBadge({ portion }: { portion?: number }) {
  if (!portion || portion === 1) return null
  const label = AMOUNTS.find((a) => a.value === portion)?.label ?? `×${portion}`
  return (
    <span className="inline-block shrink-0 ml-5 px-5 py-0 leading-[14px] border-2 border-black bg-main-orange text-12 font-title font-bold uppercase whitespace-nowrap align-middle">
      {label}
    </span>
  )
}

export default AmountPicker
