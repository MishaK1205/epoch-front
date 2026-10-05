export interface TextSegment {
  text: string;
  match: boolean;
}

/** NFC, trimmed, inner whitespace collapsed — the form sent to the search API. */
export function normalizeSearchQuery(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Lowercased query words. */
export function searchTerms(query: string): string[] {
  return normalizeSearchQuery(query).toLowerCase().split(' ').filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits `text` into segments, marking every case-insensitive occurrence of any query word. */
export function highlight(text: string, query: string): TextSegment[] {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return [{ text, match: false }];
  }
  // Longest first so "სებასტიან" wins over "სებ" when both are typed.
  const pattern = terms
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  // With a capturing group, split() puts the matched parts at the odd indexes.
  return text
    .normalize('NFC')
    .split(new RegExp(`(${pattern})`, 'iu'))
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((segment) => segment.text !== '');
}

/** Tags that contain at least one query word, for the "matched in tag" chips. */
export function matchingTags(tags: string[], query: string): string[] {
  const terms = searchTerms(query);
  return tags.filter((tag) => {
    const value = tag.normalize('NFC').toLowerCase();
    return terms.some((term) => value.includes(term));
  });
}

/** Whether `text` contains every query word (case-insensitive). */
export function containsAllTerms(text: string, query: string): boolean {
  const value = text.normalize('NFC').toLowerCase();
  return searchTerms(query).every((term) => value.includes(term));
}
