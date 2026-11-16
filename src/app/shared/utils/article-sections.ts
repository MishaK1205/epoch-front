export interface ArticleSectionLink {
  id: string;
  title: string;
}

/** Gives each `<h2>` a stable id and returns the visible titles for a table of contents. */
export function withSectionIds(html: string): { html: string; sections: ArticleSectionLink[] } {
  const sections: ArticleSectionLink[] = [];
  const next = html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (_full, attrs: string | undefined, inner: string) => {
      const title = decodeBasic(inner.replace(/<[^>]+>/g, '')).trim();
      const id = `section-${sections.length + 1}`;
      sections.push({ id, title: title || `ნაწილი ${sections.length + 1}` });
      const cleaned = (attrs ?? '').replace(/\sid="[^"]*"/i, '');
      return `<h2${cleaned} id="${id}">${inner}</h2>`;
    },
  );
  return { html: next, sections };
}

/** Rough reading time from article HTML. Georgian prose is counted by characters, not words. */
export function readingMinutes(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return 1;
  }
  return Math.max(1, Math.round(text.length / 900));
}

function decodeBasic(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
