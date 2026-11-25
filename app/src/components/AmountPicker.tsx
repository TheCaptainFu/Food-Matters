import { useState } from 'react'
import { AMOUNTS } from '../weekUtils'
import { halves, piecesText, type PiecesRecipe } from '../pieces'

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
export function AmountBadge({ portion, text }: { portion?: number; text?: string }) {
  if (text) {
    return (
      <span className="inline-block shrink-0 ml-5 px-5 py-0 leading-[14px] border-2 border-black bg-white text-12 font-title font-bold whitespace-nowrap align-middle">
        {text}
      </span>
    )
  }
  if (!portion || portion === 1) return null
  const label = AMOUNTS.find((a) => a.value === portion)?.label ?? `×${portion}`
  return (
    <span className="inline-block shrink-0 ml-5 px-5 py-0 leading-[14px] border-2 border-black bg-main-orange text-12 font-title font-bold uppercase whitespace-nowrap align-middle">
      {label}
    </span>
  )
}

export default AmountPicker

// Food in pieces: the box says "2 μπιφτέκια"; tapping it opens −/+ for the
// pieces and for the side, so "4 μπιφτέκια, same potatoes" is two taps.
export function PiecesControl({
  recipe,
  pieces,
  side,
  onChange,
}: {
  recipe: PiecesRecipe
  pieces: number
  side: number
  onChange: (pieces: number, side: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  // Opens upwards when there isn't room below (a meal low on the screen).
  const [openUp, setOpenUp] = useState(false)
  const p = recipe.pieces
  const changed = pieces !== p.count || side !== 1
  const stepBtn =
    'w-[30px] h-[30px] flex items-center justify-center font-bold text-16 cursor-pointer hover:bg-main-yellow disabled:opacity-30 disabled:pointer-events-none'
  const row = (label: string, value: string, onMinus: () => void, onPlus: () => void, minusOff: boolean, plusOff: boolean) => (
    <div className="flex items-center justify-between gap-15">
      <span className="text-14 font-title font-bold first-letter:uppercase">{label}</span>
      <span className="flex items-center border-2 border-black bg-white">
        <button type="button" onClick={onMinus} disabled={minusOff} aria-label={`Λιγότερα: ${label}`} className={stepBtn}>
          −
        </button>
        <span className="min-w-[36px] text-center text-14 font-title font-bold">{value}</span>
        <button type="button" onClick={onPlus} disabled={plusOff} aria-label={`Περισσότερα: ${label}`} className={stepBtn}>
          +
        </button>
      </span>
    </div>
  )
  return (
    <span className="relative inline-block shrink-0 ml-5 align-middle">
      <button
        type="button"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          setOpenUp(window.innerHeight - box.bottom < 190 && box.top > 190)
          setIsOpen((v) => !v)
        }}
        aria-expanded={isOpen}
        title="Πόσα έφαγες"
        className={`inline-block px-5 py-0 leading-[14px] border-2 border-black text-12 font-title font-bold whitespace-nowrap cursor-pointer hover:bg-main-yellow ${
          changed ? 'bg-main-orange' : 'bg-white'
        }`}
      >
        {piecesText(recipe, pieces, side)}
      </button>
      {isOpen && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <span
            className={`absolute left-0 z-40 w-[230px] ${
              openUp ? 'bottom-full mb-5' : 'top-full mt-5'
            } flex flex-col gap-10 p-10 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] font-normal`}
          >
            {row(
              p.many,
              halves(pieces),
              () => onChange(Math.max(0, pieces - 1), side),
              () => onChange(pieces + 1, side),
              pieces <= 0 || (pieces <= 1 && side === 0),
              pieces >= 20,
            )}
            {p.side &&
              row(
                p.side,
                side === 0 ? '0' : `×${halves(side)}`,
                () => onChange(pieces, Math.max(0, side - 0.5)),
                () => onChange(pieces, side + 0.5),
                side <= 0 || (side <= 0.5 && pieces === 0),
                side >= 3,
              )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="main-btn self-end px-10 py-5 text-14 font-title font-bold bg-main-blue text-white"
            >
              OK
            </button>
          </span>
        </>
      )}
    </span>
  )
}
