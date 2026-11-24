import { addDays, toISODate } from './weekUtils'

// The Orthodox calendar as it affects what's on the table: fasting days and
// periods, and the big feasts. Dates are computed for any year (no lookup
// tables to go stale).

export type DayInfo = {
  // A fasting day: no meat, fish, dairy or eggs.
  fasting: boolean
  // On some fasting days fish is allowed (Ευαγγελισμός, Βαΐων, Μεταμόρφωση).
  fishAllowed?: boolean
  // Short reason, e.g. "Μεγάλη Σαρακοστή", "Τετάρτη", "Δεκαπενταύγουστος".
  reason?: string
  // A feast worth marking, e.g. "Πάσχα", "Χριστούγεννα", "Καθαρά Δευτέρα".
  feast?: string
}

// Orthodox Easter (Julian computus, Meeus), converted to the Gregorian
// calendar (+13 days for 1900–2099).
export function orthodoxEaster(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31) // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1
  return addDays(new Date(year, month - 1, day), 13)
}

function md(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}`
}

// Fixed-date fasting days outside the fasting periods.
const FIXED_FASTS: Record<string, string> = {
  '1-5': 'Παραμονή Θεοφανείων',
  '8-29': 'Αποκεφαλισμός Προδρόμου',
  '9-14': 'Ύψωση του Τιμίου Σταυρού',
}

const FIXED_FEASTS: Record<string, string> = {
  '1-1': 'Πρωτοχρονιά',
  '1-6': 'Θεοφάνεια',
  '3-25': 'Ευαγγελισμός',
  '8-15': 'Κοίμηση της Θεοτόκου',
  '10-28': 'Επέτειος του Όχι',
  '12-25': 'Χριστούγεννα',
  '12-26': 'Σύναξη της Θεοτόκου',
}

const cache = new Map<number, Map<string, { offset: number }>>()

// Days counted from Easter, keyed by ISO date, for one year.
function easterOffsets(year: number): Map<string, { offset: number }> {
  let map = cache.get(year)
  if (!map) {
    map = new Map()
    const easter = orthodoxEaster(year)
    for (let offset = -80; offset <= 70; offset++) map.set(toISODate(addDays(easter, offset)), { offset })
    cache.set(year, map)
  }
  return map
}

export function dayInfo(date: Date): DayInfo {
  const year = date.getFullYear()
  const iso = toISODate(date)
  const key = md(date)
  const offset = easterOffsets(year).get(iso)?.offset
  const weekday = date.getDay() // 0 = Sunday
  const month = date.getMonth() + 1
  const dom = date.getDate()

  // ---- feasts ----
  let feast: string | undefined = FIXED_FEASTS[key]
  if (offset === 0) feast = 'Πάσχα'
  else if (offset === 1) feast = 'Δευτέρα του Πάσχα'
  else if (offset === -48) feast = 'Καθαρά Δευτέρα'
  else if (offset === -59) feast = 'Τσικνοπέμπτη'
  else if (offset === -7) feast = 'Κυριακή των Βαΐων'
  else if (offset === -2) feast = 'Μεγάλη Παρασκευή'
  else if (offset === 49) feast = 'Πεντηκοστή'
  else if (offset === 50) feast = 'Αγίου Πνεύματος'

  // ---- fast-free periods: no Wednesday/Friday fast ----
  const fastFree =
    (offset !== undefined && offset >= 1 && offset <= 6) || // Διακαινήσιμος
    (offset !== undefined && offset >= 50 && offset <= 56) || // week after Pentecost
    (offset !== undefined && offset >= -70 && offset <= -64) || // Τελώνου και Φαρισαίου
    (month === 12 && dom >= 25) ||
    (month === 1 && dom <= 4) // Δωδεκαήμερο

  // ---- fasting periods ----
  if (offset !== undefined && offset >= -48 && offset <= -1) {
    const fishAllowed = offset === -7 || key === '3-25'
    return { fasting: true, fishAllowed, reason: offset >= -6 ? 'Μεγάλη Εβδομάδα' : 'Μεγάλη Σαρακοστή', feast }
  }
  if (month === 8 && dom <= 14) {
    return { fasting: true, fishAllowed: dom === 6, reason: 'Δεκαπενταύγουστος', feast: dom === 6 ? 'Μεταμόρφωση' : feast }
  }
  if ((month === 11 && dom >= 15) || (month === 12 && dom <= 24)) {
    // Fish is traditionally allowed for most of this fast; keep it simple
    // and strict only from Dec 18.
    return { fasting: true, fishAllowed: month === 11 || dom < 18, reason: 'Σαρακοστή Χριστουγέννων', feast }
  }
  // Αποστόλων: from the Monday after All Saints (Easter + 57) to June 28.
  if (offset !== undefined && offset >= 57) {
    if (month < 6 || (month === 6 && dom <= 28)) return { fasting: true, fishAllowed: true, reason: 'Νηστεία Αγίων Αποστόλων', feast }
  } else if (offset === undefined && month === 6 && dom <= 28) {
    const allSaintsMonday = addDays(orthodoxEaster(year), 57)
    if (date >= allSaintsMonday) return { fasting: true, fishAllowed: true, reason: 'Νηστεία Αγίων Αποστόλων', feast }
  }

  if (FIXED_FASTS[key]) return { fasting: true, reason: FIXED_FASTS[key], feast }

  // Τυροφάγου (the week before Lent): no meat, but dairy and fish are fine.
  if (offset !== undefined && offset >= -55 && offset <= -49) {
    return { fasting: false, reason: 'Τυροφάγου · χωρίς κρέας', feast }
  }
  if (!fastFree && !feast && (weekday === 3 || weekday === 5)) {
    return { fasting: true, reason: weekday === 3 ? 'Τετάρτη' : 'Παρασκευή' }
  }
  return { fasting: false, feast }
}
