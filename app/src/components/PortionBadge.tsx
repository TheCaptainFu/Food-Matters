import { portionLabel } from '../weekUtils'

// Shown next to a planned dish when the plan asks for more than one
// portion of it, so "1½ μερίδα" isn't hidden in the calories.
function PortionBadge({ portion, className = '' }: { portion: number; className?: string }) {
  if (portion === 1) return null
  return (
    <span
      className={`inline-flex items-center shrink-0 px-5 py-[1px] border-2 border-black bg-main-orange text-12 font-title font-bold uppercase whitespace-nowrap align-middle ${className}`}
      title="Η μερίδα είναι μεγαλύτερη για να πιάσεις τον στόχο θερμίδων σου"
    >
      ×{portionLabel(portion)}
    </span>
  )
}

export default PortionBadge
