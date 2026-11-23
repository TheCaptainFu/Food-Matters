import type { Recipe, Week, Day, SlotKey } from './types'
import { DAY_LABELS, makeDay, makeWeek } from './weekUtils'

// Loaded on demand (not bundled into the main chunk) since most visits never
// touch Excel import/export.
async function loadXlsx() {
  return import('xlsx')
}

const SLOT_COLUMNS: { key: SlotKey; header: string }[] = [
  { key: 'breakfast', header: 'Πρωινό' },
  { key: 'lunch', header: 'Μεσημεριανό' },
  { key: 'afternoon', header: 'Απογευματινό' },
  { key: 'dinner', header: 'Βραδινό' },
]

// A blank, ready-to-fill week — one row per day, one column per meal, cells
// are recipe titles (comma-separate for more than one per slot). Given to
// the user so they know exactly what importWeekFromExcel expects back.
export async function downloadWeekTemplate(recipes: Recipe[]) {
  const XLSX = await loadXlsx()
  const header = ['Μέρα', ...SLOT_COLUMNS.map((s) => s.header)]
  const example = recipes[0]?.title ?? 'Χωριάτικη σαλάτα'
  const rows = [
    header,
    [DAY_LABELS[0], example, '', '', ''],
    ...DAY_LABELS.slice(1).map((label) => [label, '', '', '', '']),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Εβδομάδα')
  XLSX.writeFile(book, 'food-matters-week-template.xlsx')
}

export type WeekImportResult = { week: Week; skipped: string[] }

// Reads an .xlsx/.xls/.csv built from the template above. Day rows are
// matched by position (1st data row = Monday, ...), not by whatever text is
// in the Day column — more forgiving of typos than matching that label.
// Recipe names are matched to the existing recipe list by title
// (case-insensitive); anything that doesn't match is skipped and reported
// back so the user knows what to fix, rather than failing the whole import.
export async function importWeekFromExcel(file: File, recipes: Recipe[], startDate: string): Promise<WeekImportResult> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array' })
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) return { week: makeWeek(startDate), skipped: [] }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  const dataRows = rows.slice(1, 8)
  const recipeByTitle = new Map(recipes.map((r) => [r.title.trim().toLowerCase(), r]))
  const skipped: string[] = []

  const days: Day[] = DAY_LABELS.map((label, dayIndex) => {
    const row = dataRows[dayIndex] ?? []
    const day = makeDay(label)
    SLOT_COLUMNS.forEach((slot, colIndex) => {
      const cell = row[colIndex + 1]
      if (cell == null || cell === '') return
      String(cell)
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const recipe = recipeByTitle.get(name.toLowerCase())
          if (recipe) day.slots[slot.key].push(recipe.id)
          else skipped.push(name)
        })
    })
    return day
  })

  return { week: makeWeek(startDate, days), skipped: [...new Set(skipped)] }
}
