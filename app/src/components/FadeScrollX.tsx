import { useRef, type ReactNode } from 'react'
import { useScrollFade } from '../useScrollFade'

// A box that scrolls sideways (wide tables) with a soft fade on the side
// that has more, instead of a hard cut.
function FadeScrollX({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { style } = useScrollFade(ref, 40)
  return (
    <div ref={ref} style={style} className={`overflow-x-auto ${className}`}>
      {children}
    </div>
  )
}

export default FadeScrollX
