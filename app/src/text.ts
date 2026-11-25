// Lowercase without Greek accents (or diaeresis), so a search for
// "φρεντο" finds "Φρέντο" and "κοτοπουλο" finds "Κοτόπουλο".
export function plainText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Does `text` contain what was typed, ignoring case and accents?
export function matchesSearch(text: string, query: string): boolean {
  return plainText(text).includes(plainText(query.trim()))
}
