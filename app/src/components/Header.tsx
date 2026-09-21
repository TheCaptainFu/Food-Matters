import Logo from './Logo'

type HeaderProps = {
  isMenuOpen: boolean
  onToggleMenu: () => void
}

function Header({ isMenuOpen, onToggleMenu }: HeaderProps) {
  return (
    <header className="py-20 border-b-3">
      <div className="container flex items-center gap-20">
        <div className="w-40 shrink-0 tab:hidden" aria-hidden="true" />

        <h1 className="flex-1">
          <Logo />
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
