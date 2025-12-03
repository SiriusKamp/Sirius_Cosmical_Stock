/**
 * Normalizes text by removing accents and converting to lowercase
 * Useful for search/filter operations that should ignore accents and case
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks if the text includes the search term, ignoring accents and case
 */
export function normalizedIncludes(text: string, searchTerm: string): boolean {
  return normalizeText(text).includes(normalizeText(searchTerm));
}
