// A bold drawn arrow for the ‹ › buttons (the font's ‹ › are thin and tiny).
function Chevron({ dir, size = 18 }: { dir: 'left' | 'right'; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20'} />
    </svg>
  )
}

export default Chevron
