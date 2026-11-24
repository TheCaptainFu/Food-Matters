import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

// Soft fade on the side(s) of a horizontally scrolling box where there's
// more to see, so content doesn't look cut off — and disappears at the ends.
export function useScrollFade(ref: RefObject<HTMLElement | null>, size = 32) {
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const left = el.scrollLeft > 2
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    const frame = requestAnimationFrame(measure)
    el.addEventListener('scroll', measure, { passive: true })
    const resize = new ResizeObserver(measure)
    resize.observe(el)
    // Content changing (chips added, a new week) changes the scroll width.
    const mutation = new MutationObserver(measure)
    mutation.observe(el, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', measure)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [ref])

  const mask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'}, #000 ${size}px, #000 calc(100% - ${size}px), ${edges.right ? 'transparent' : '#000'})`
      : undefined
  const style: CSSProperties = mask ? { maskImage: mask, WebkitMaskImage: mask } : {}
  return { style, canLeft: edges.left, canRight: edges.right }
}
