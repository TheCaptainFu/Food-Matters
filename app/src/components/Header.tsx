import type { User } from '@supabase/supabase-js'
import Logo from './Logo'

type HeaderProps = {
  // Restarts the guided tour (phones; desktop has it in the tab row).
  onHelp: () => void
  user: User | null
  onOpenProfile: () => void
}

function ProfileIcon({ user }: { user: User | null }) {
  if (user?.user_metadata?.avatar_url) {
    return <img src={user.user_metadata.avatar_url} alt="Το προφίλ σου" className="w-full h-full object-cover" />
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="black" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="black" />
    </svg>
  )
}

function Header({ onHelp, user, onOpenProfile }: HeaderProps) {
  return (
    <header className="sticky tab:static top-0 z-40 bg-white py-15 tab:py-20 border-b-3">
      <div className="container flex items-center gap-20">
        <h1 className="flex-1">
          <Logo className="text-32 text-left tab:text-52 tab:text-center" />
        </h1>


        {/* Phones: pages are in the bottom bar, so only help sits up here. */}
        <button
          type="button"
          aria-label="Βοήθεια"
          title="Βοήθεια"
          data-tour="help-mobile"
          onClick={onHelp}
          className="appearance-none main-btn tab:hidden flex items-center justify-center w-40 h-40 p-0 shrink-0 font-title font-bold text-20"
        >
          ?
        </button>

        <button
          type="button"
          aria-label="Το προφίλ σου"
          data-tour="profile"
          onClick={onOpenProfile}
          className="appearance-none main-btn flex items-center justify-center w-40 h-40 p-0 shrink-0 overflow-hidden"
        >
          <ProfileIcon user={user} />
        </button>
      </div>
    </header>
  )
}

export default Header
