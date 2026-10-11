/**
 * Utility to split paragraphs, reviews, or multi-sentence statements into discrete sentences.
 * Protects abbreviations and decimals.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Protect common abbreviations and numbers
  let safe = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|vs|etc|e\.g|i\.e|approx|dept|inc|ltd)\./gi, '$1_DOT_')
    .replace(/(\d+)\.(\d+)/g, '$1_DECIMAL_$2');

  // Split on punctuation followed by whitespace or line break
  const rawParts = safe.split(/(?<=[.?!])\s+|\n+/);

  const cleaned = rawParts
    .map((part) =>
      part
        .replace(/_DOT_/g, '.')
        .replace(/_DECIMAL_/g, '.')
        .trim()
    )
    .filter((s) => s.length >= 3);

  // If no punctuation split happened but text is non-empty
  if (cleaned.length === 0 && text.trim().length >= 3) {
    return [text.trim()];
  }

  return cleaned;
}
