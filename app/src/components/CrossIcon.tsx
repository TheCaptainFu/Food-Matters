// The fasting mark, drawn rather than the ✝ character, which some phones
// turn into a purple emoji tile. Takes the text colour and sits on the
// text line.
function CrossIcon({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 16"
      width={size * 0.75}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={`inline-block shrink-0 align-[-1px] ${className}`}
    >
      <rect x="4.5" y="0" width="3" height="16" />
      <rect x="0" y="4" width="12" height="3" />
    </svg>
  )
}

export default CrossIcon
