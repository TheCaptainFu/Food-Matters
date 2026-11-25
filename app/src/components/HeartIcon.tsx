// ♥ for favourites, drawn so it looks the same on every phone: an outline
// when off, filled red when on.
function HeartIcon({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill={on ? '#ef4444' : 'none'}
      stroke="black"
      strokeWidth="2.5"
      strokeLinejoin="round"
    >
      <path d="M12 21 L3.5 12.5 A5 5 0 0 1 12 5.5 A5 5 0 0 1 20.5 12.5 Z" />
    </svg>
  )
}

export default HeartIcon
