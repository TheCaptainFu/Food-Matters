import type { ActualEntry, Recipe } from '../types'
import { entryRecipe } from '../pieces'

// A logged meal's name on one line ("…" when too long). Tapping it opens
// the recipe when there is one behind it.
function EntryTitle({
  entry,
  prefix,
  recipes,
  onOpenRecipe,
}: {
  entry: ActualEntry
  prefix: string
  recipes: Recipe[]
  onOpenRecipe: (id: string) => void
}) {
  const recipe = entryRecipe(entry, recipes)
  const text = prefix ? `${prefix} ${entry.description}` : entry.description
  if (!recipe) {
    return (
      <span className="truncate" title={entry.description}>
        {text}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpenRecipe(recipe.id)}
      title={entry.description}
      className="truncate min-w-0 text-left hover:underline cursor-pointer"
    >
      {text}
    </button>
  )
}

export default EntryTitle
