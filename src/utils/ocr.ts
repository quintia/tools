export interface ProgressUpdate {
  status: string;
  progress: number;
}

/**
 * Calculates the overall progress for a multi-page PDF document.
 * @param currentPage Zero-based index of the current page being processed.
 * @param totalPages Total number of pages in the document.
 * @param pageProgress Progress of the current page (0 to 1).
 * @returns Combined progress (0 to 1).
 */
export function calculatePdfProgress(
  currentPage: number,
  totalPages: number,
  pageProgress: number,
): number {
  if (totalPages <= 0) return 0;
  return (currentPage + pageProgress) / totalPages;
}

/**
 * Formats the text extracted from multiple pages into a single string.
 */
export function formatOcrResult(pages: { pageNumber: number; text: string }[]): string {
  return pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}\n\n`)
    .join("")
    .trim();
}

/**
 * Validates if the selected language code is supported.
 */
export function isLanguageSupported(code: string, supportedLanguages: { code: string }[]): boolean {
  return supportedLanguages.some((lang) => lang.code === code);
}
