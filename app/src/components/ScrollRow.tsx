import { useRef } from 'react'
import type { ReactNode } from 'react'

// A single row of chips that scrolls sideways when it doesn't fit, instead
// of wrapping onto a second line. No visible scrollbar: touch swipes it,
// a mouse can drag it or use the wheel.
function ScrollRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)

  return (
    <div
      ref={ref}
      className={`flex gap-10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-5 pr-5 min-w-0 ${className}`}
      onWheel={(e) => {
        const el = ref.current
        if (!el || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
        el.scrollLeft += e.deltaY
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return
        drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || !ref.current) return
        const dx = e.clientX - d.x
        if (Math.abs(dx) > 5) d.moved = true
        if (d.moved) ref.current.scrollLeft = d.left - dx
      }}
      onPointerUp={() => {
        // Keep the flag until the click that follows a drag has been swallowed.
        setTimeout(() => (drag.current = null), 0)
      }}
      onPointerLeave={() => (drag.current = null)}
      onClickCapture={(e) => {
        if (drag.current?.moved) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {children}
    </div>
  )
}

export default ScrollRow
