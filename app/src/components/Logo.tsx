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

type LogoProps = {
  className?: string
}

function Logo({ className }: LogoProps) {
  return (
    <div
      className={`font-title font-black uppercase text-white leading-none ${className ?? 'text-52 text-center'}`}
      style={{
        WebkitTextStroke: '3px black',
        paintOrder: 'stroke fill',
        textShadow: extrudeShadow,
      }}
    >
      Food
      <br />
      Matters
    </div>
  )
}

export default Logo
