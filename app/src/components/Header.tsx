// Builds a stack of 1px-incrementing text-shadow layers so the letters
// look like a solid 3D extruded block instead of a single flat shadow copy.
function buildExtrudeShadow(steps: number, color: string) {
  const layers: string[] = []
  for (let i = 1; i <= steps; i++) {
    layers.push(`-${i}px ${i}px 0 ${color}`)
  }
  return layers.join(', ')
}

const EXTRUDE_DEPTH = 14
const extrudeShadow = buildExtrudeShadow(EXTRUDE_DEPTH, '#000')

type HeaderProps = {
  isMenuOpen: boolean
  onToggleMenu: () => void
}

function Header({ isMenuOpen, onToggleMenu }: HeaderProps) {
  return (
    <header className="py-20 border-b-3">
      <div className="container flex items-center gap-20">
        <div className="w-40 shrink-0 tab:hidden" aria-hidden="true" />

        <h1
          className="flex-1 text-52 font-title font-black uppercase text-white text-center leading-none"
          style={{
            WebkitTextStroke: '3px black',
            paintOrder: 'stroke fill',
            textShadow: extrudeShadow,
          }}
        >
          Food
          <br />
          Matters
        </h1>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
          className="appearance-none main-btn tab:hidden flex flex-col justify-center gap-5 w-40 h-40 p-5 shrink-0"
        >
          <span className="block h-[3px] bg-black" />
          <span className="block h-[3px] bg-black" />
          <span className="block h-[3px] bg-black" />
        </button>
      </div>
    </header>
  )
}

export default Header
