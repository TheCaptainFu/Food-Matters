import type { User } from '@supabase/supabase-js'
import Logo from './Logo'

type HeaderProps = {
  isMenuOpen: boolean
  onToggleMenu: () => void
  user: User | null
  onOpenProfile: () => void
}

function ProfileIcon({ user }: { user: User | null }) {
  if (user?.user_metadata?.avatar_url) {
    return <img src={user.user_metadata.avatar_url} alt="Your profile" className="w-full h-full object-cover" />
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="black" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="black" />
    </svg>
  )
}

function Header({ isMenuOpen, onToggleMenu, user, onOpenProfile }: HeaderProps) {
  return (
    <header className="sticky tab:static top-0 z-40 bg-white py-20 border-b-3">
      <div className="container flex items-center gap-20">
        <h1 className="flex-1">
          <Logo className="text-32 text-left tab:text-52 tab:text-center" />
        </h1>

        <button
          type="button"
          aria-label="Your profile"
          onClick={onOpenProfile}
          className="appearance-none main-btn flex items-center justify-center w-40 h-40 p-0 shrink-0 overflow-hidden"
        >
          <ProfileIcon user={user} />
        </button>

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
