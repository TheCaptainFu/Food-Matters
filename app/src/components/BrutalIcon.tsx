import type { ReactNode } from 'react'

// Flat, thick-outlined icons with a hard offset shadow — the app's
// neo-brutalist look, instead of the phone's glossy emoji (which also look
// different on every device).

const K = '#000'
const Y = '#ffec62'
const O = '#ff8d27'
const T = '#95d9df'
const B = '#5e81d1'
const R = '#f16b44'
const W = '#fff'
const SKIN = '#ffd3a8'
const OLIVE = '#a6c25a'

const s = { stroke: K, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

const ICONS = {
  woman: (
    <>
      <path d="M14 46 V28 a18 18 0 0 1 36 0 V46 Z" fill={O} {...s} />
      <path d="M10 62 q0 -14 22 -14 q22 0 22 14" fill={T} {...s} />
      <circle cx="32" cy="29" r="13" fill={SKIN} {...s} />
      <path d="M18 26 q6 -12 14 -10 q8 -2 14 10 q-10 -4 -14 -10 q-4 6 -14 10 Z" fill={O} {...s} />
      <circle cx="27" cy="30" r="2" fill={K} />
      <circle cx="37" cy="30" r="2" fill={K} />
      <path d="M27 36 q5 4 10 0" fill="none" {...s} strokeWidth={3} />
    </>
  ),
  man: (
    <>
      <path d="M10 62 q0 -14 22 -14 q22 0 22 14" fill={Y} {...s} />
      <circle cx="32" cy="30" r="14" fill={SKIN} {...s} />
      <path d="M17 28 q-1 -16 15 -16 q16 0 15 16 q-6 -8 -15 -8 q-9 0 -15 8 Z" fill={B} {...s} />
      <circle cx="27" cy="31" r="2" fill={K} />
      <circle cx="37" cy="31" r="2" fill={K} />
      <path d="M27 37 q5 4 10 0" fill="none" {...s} strokeWidth={3} />
    </>
  ),
  sofa: (
    <>
      <rect x="14" y="16" width="36" height="22" fill={T} {...s} />
      <rect x="6" y="28" width="12" height="22" fill={T} {...s} />
      <rect x="46" y="28" width="12" height="22" fill={T} {...s} />
      <rect x="18" y="36" width="28" height="14" fill={W} {...s} />
      <path d="M10 50 v6 M54 50 v6" {...s} />
    </>
  ),
  shoe: (
    <>
      <path d="M6 44 V24 h14 q4 10 14 10 l16 4 q8 2 8 10 v4 H6 Z" fill={Y} {...s} />
      <path d="M6 46 H58" {...s} />
      <path d="M24 30 l4 -4 M30 33 l4 -4" {...s} strokeWidth={3} />
    </>
  ),
  flame: (
    <>
      <path d="M32 6 q4 12 12 20 q8 9 8 18 a20 20 0 0 1 -40 0 q0 -10 8 -16 q0 8 6 10 q-2 -18 6 -32 Z" fill={O} {...s} />
      <path d="M32 34 q8 6 8 14 a8 8 0 0 1 -16 0 q0 -8 8 -14 Z" fill={Y} {...s} />
    </>
  ),
  down: (
    <>
      <path d="M22 8 h20 v24 h12 L32 58 L10 32 h12 Z" fill={T} {...s} />
    </>
  ),
  up: (
    <>
      <path d="M22 56 h20 V32 h12 L32 6 L10 32 h12 Z" fill={O} {...s} />
    </>
  ),
  scale: (
    <>
      <path d="M32 10 V54 M18 56 h28" {...s} />
      <path d="M10 18 H54" {...s} />
      <path d="M10 18 L4 36 h12 Z M54 18 L48 36 h12 Z" fill={Y} {...s} />
      <circle cx="32" cy="12" r="5" fill={Y} {...s} />
    </>
  ),
  dumbbell: (
    <>
      <rect x="20" y="28" width="24" height="8" fill={W} {...s} />
      <rect x="8" y="16" width="12" height="32" fill={B} {...s} />
      <rect x="44" y="16" width="12" height="32" fill={B} {...s} />
      <rect x="2" y="24" width="6" height="16" fill={B} {...s} />
      <rect x="56" y="24" width="6" height="16" fill={B} {...s} />
    </>
  ),
  cross: (
    <>
      <path d="M26 4 h12 v14 h14 v12 H38 v30 H26 V30 H12 V18 h14 Z" fill={Y} {...s} />
    </>
  ),
  star: (
    <>
      <path d="M32 4 l7 17 l18 1 l-14 12 l5 18 l-16 -10 l-16 10 l5 -18 l-14 -12 l18 -1 Z" fill={Y} {...s} />
    </>
  ),
  drumstick: (
    <>
      <path d="M20 44 l-8 8 a5 5 0 1 1 -4 -4 l8 -8" fill={W} {...s} />
      <ellipse cx="38" cy="26" rx="18" ry="14" transform="rotate(-45 38 26)" fill={O} {...s} />
    </>
  ),
  pasta: (
    <>
      <path d="M8 30 h48 a24 24 0 0 1 -48 0 Z" fill={W} {...s} />
      <path d="M14 30 q4 -14 10 -6 q4 -12 10 -4 q6 -12 12 -2 q4 -6 6 12" fill={Y} {...s} />
    </>
  ),
  olive: (
    <>
      <ellipse cx="30" cy="38" rx="16" ry="20" transform="rotate(-20 30 38)" fill={OLIVE} {...s} />
      <path d="M38 18 q6 -10 16 -12" fill="none" {...s} />
      <path d="M46 8 q8 0 10 6 q-8 2 -10 -6 Z" fill={OLIVE} {...s} />
    </>
  ),
  drop: (
    <>
      <path d="M32 4 q20 26 20 38 a20 20 0 0 1 -40 0 q0 -12 20 -38 Z" fill={B} {...s} />
      <path d="M22 42 a10 10 0 0 0 6 10" fill="none" stroke={W} strokeWidth={4} strokeLinecap="round" />
    </>
  ),
  heart: (
    <>
      <path d="M32 56 L8 32 a13 13 0 0 1 24 -16 a13 13 0 0 1 24 16 Z" fill={R} {...s} />
    </>
  ),
} satisfies Record<string, ReactNode>

export type BrutalIconName = keyof typeof ICONS

function BrutalIcon({ name, size = 48, className = '' }: { name: BrutalIconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="-4 -4 72 72"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 overflow-visible ${className}`}
      style={{ filter: 'drop-shadow(3px 3px 0 #000)' }}
    >
      {ICONS[name]}
    </svg>
  )
}

export default BrutalIcon
