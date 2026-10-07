import { DocxInline, DocxParagraph, inlineText } from '../../../../shared/utils/docx';

/** One question read from a document, before its images are uploaded. */
export interface ImportedQuestion {
  /** Question text, one entry per line (paragraph or manual line break). */
  body: DocxInline[][];
  answer: string;
  comment: string;
  /** Images found in the answer or comment, which are plain text and can't hold them. */
  skippedImages: number;
}

type LabelKind = 'answer' | 'accepted' | 'comment' | 'other';
type Section = 'body' | 'answer' | 'comment' | 'other';

interface Line {
  inlines: DocxInline[];
  text: string;
  label: { kind: LabelKind; rest: string } | null;
  /** List of the paragraph, on its first line only (`list|level`, ordered lists only). */
  listKey: string | null;
}

const LABEL = new RegExp(
  '^\\s*(პასუხ(?:ი|ები)|ჩათვლა|არ\\s+ჩაითვლება|კომენტარი|წყარო(?:ები)?|ავტორ(?:ი|ები)' +
    '|ответ|незач[её]т|зач[её]т|комментарий|источники?|авторы?)\\s*[:：]\\s*',
  'i',
);
const LABEL_KINDS: ReadonlyArray<[RegExp, LabelKind]> = [
  [/^(პასუხ|ответ)/i, 'answer'],
  [/^(ჩათვლა|არ|зач|незач)/i, 'accepted'],
  [/^(კომენტარი|комментарий)/i, 'comment'],
];
/** "Break" between rounds: ends the current question like a source line. */
const BREAK_LINE = /^\s*შესვენება\s*\.?\s*$/;
/** Typed question number: `12.` / `12)` (not `1.5`). */
const TYPED_NUMBER = /^\s*(\d{1,3})\s*[.)](?!\d)\s*/;

/**
 * Splits a "What? Where? When?" document into questions. A question starts at an item of the
 * numbered list whose items are followed by `პასუხი:` (Word's automatic numbering), or — when
 * there is no such list — at a typed number (`1.`, `2)`, …) followed by `პასუხი:`. Everything up
 * to `პასუხი:` is the question; `ჩათვლა:` / `არ ჩაითვლება:` lines are kept in the answer;
 * `კომენტარი:` is the comment; `წყარო:`, `ავტორი:` and "შესვენება" end it. Text before the first
 * question (title, editors) is ignored.
 */
export function splitQuestions(paragraphs: readonly DocxParagraph[]): ImportedQuestion[] {
  const lines = toLines(paragraphs);
  const nextLabels = nextLabelKinds(lines);
  const starts = listStarts(lines, nextLabels) ?? typedNumberStarts(lines, nextLabels);

  const questions: ImportedQuestion[] = [];
  let current: {
    body: DocxInline[][];
    answer: string[];
    comment: string[];
    images: number;
  } | null = null;
  let section: Section = 'body';
  const finish = (): void => {
    if (current) {
      questions.push({
        body: trimBlankLines(current.body),
        answer: current.answer.join('\n'),
        comment: current.comment.join('\n'),
        skippedImages: current.images,
      });
    }
  };

  lines.forEach((line, index) => {
    const start = starts.get(index);
    if (start) {
      finish();
      current = { body: [start], answer: [], comment: [], images: 0 };
      section = 'body';
      return;
    }
    if (!current) {
      return;
    }
    if (line.label) {
      section = line.label.kind === 'accepted' ? 'answer' : line.label.kind;
    } else if (BREAK_LINE.test(line.text)) {
      section = 'other';
      return;
    }
    if (section === 'body') {
      current.body.push(line.inlines);
      return;
    }
    if (section === 'other') {
      return;
    }
    current.images += line.inlines.filter((inline) => inline.kind === 'image').length;
    const text = (line.label?.kind === 'accepted' ? line.text : (line.label?.rest ?? line.text))
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      current[section].push(text);
    }
  });
  finish();
  return questions;
}

/** Relationship ids of the images in a question, in order, without duplicates. */
export function questionImageIds(body: readonly DocxInline[][]): string[] {
  const ids = body.flat().flatMap((inline) => (inline.kind === 'image' ? [inline.id] : []));
  return [...new Set(ids)];
}

/**
 * Quill-compatible HTML: one `<p>` per line, bold / italic / underline / strike, external links
 * and uploaded images (ids missing from `imageUrls` are left out). `''` when nothing is left.
 */
export function questionHtml(
  body: readonly DocxInline[][],
  imageUrls: ReadonlyMap<string, string>,
): string {
  const lines = body.map((line) => line.map((inline) => inlineHtml(inline, imageUrls)).join(''));
  const hasContent = body.some((line, index) =>
    line.some((inline) => (inline.kind === 'text' ? inline.text.trim() !== '' : !!lines[index])),
  );
  return hasContent ? lines.map((html) => `<p>${html || '<br>'}</p>`).join('') : '';
}

function toLines(paragraphs: readonly DocxParagraph[]): Line[] {
  const lines: Line[] = [];
  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    const listKey = list?.ordered ? `${list.list}|${list.level}` : null;
    paragraph.lines.forEach((inlines, index) => {
      const text = inlineText(inlines);
      const match = LABEL.exec(text);
      lines.push({
        inlines,
        text,
        label: match ? { kind: labelKind(match[1]), rest: text.slice(match[0].length) } : null,
        listKey: index === 0 ? listKey : null,
      });
    });
  }
  return lines;
}

function labelKind(word: string): LabelKind {
  return LABEL_KINDS.find(([pattern]) => pattern.test(word))?.[1] ?? 'other';
}

/** For every line, the kind of the first label on a later line (`null` = none). */
function nextLabelKinds(lines: readonly Line[]): (LabelKind | null)[] {
  const result: (LabelKind | null)[] = new Array(lines.length).fill(null);
  let next: LabelKind | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    result[i] = next;
    next = lines[i].label?.kind ?? next;
  }
  return result;
}

/** Line index → first body line. `null` when no numbered list holds the questions. */
function listStarts(
  lines: readonly Line[],
  nextLabels: readonly (LabelKind | null)[],
): Map<number, DocxInline[]> | null {
  const scores = new Map<string, number>();
  lines.forEach((line, index) => {
    if (line.listKey && !line.label && nextLabels[index] === 'answer') {
      scores.set(line.listKey, (scores.get(line.listKey) ?? 0) + 1);
    }
  });
  const best = [...scores].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!best) {
    return null;
  }
  const starts = new Map<number, DocxInline[]>();
  lines.forEach((line, index) => {
    if (line.listKey === best && !line.label) {
      starts.set(index, line.inlines);
    }
  });
  return starts;
}

/** Typed numbers must follow each other (the first one may be any number, e.g. round 2 = 13.). */
function typedNumberStarts(
  lines: readonly Line[],
  nextLabels: readonly (LabelKind | null)[],
): Map<number, DocxInline[]> {
  const starts = new Map<number, DocxInline[]>();
  let expected: number | null = null;
  lines.forEach((line, index) => {
    const match = TYPED_NUMBER.exec(line.text);
    if (!match || line.label || nextLabels[index] !== 'answer') {
      return;
    }
    const number = Number(match[1]);
    if (expected === null || number === expected) {
      starts.set(index, stripPrefix(line.inlines, match[0].length));
      expected = number + 1;
    }
  });
  return starts;
}

/** Removes the first `length` characters of text (the typed number). */
function stripPrefix(inlines: readonly DocxInline[], length: number): DocxInline[] {
  let remaining = length;
  const result: DocxInline[] = [];
  for (const inline of inlines) {
    if (remaining > 0 && inline.kind === 'text') {
      const cut = Math.min(remaining, inline.text.length);
      remaining -= cut;
      if (cut < inline.text.length) {
        result.push({ ...inline, text: inline.text.slice(cut) });
      }
    } else {
      result.push(inline);
    }
  }
  return result;
}

/** Without blank lines at the start / end and with runs of blank lines collapsed to one. */
function trimBlankLines(lines: readonly DocxInline[][]): DocxInline[][] {
  const blank = (line: readonly DocxInline[]): boolean =>
    line.every((inline) => inline.kind === 'text' && inline.text.trim() === '');
  const result: DocxInline[][] = [];
  for (const line of lines) {
    if (!blank(line) || (result.length > 0 && !blank(result[result.length - 1]))) {
      result.push(line);
    }
  }
  while (result.length > 0 && blank(result[result.length - 1])) {
    result.pop();
  }
  return result;
}

function inlineHtml(inline: DocxInline, imageUrls: ReadonlyMap<string, string>): string {
  if (inline.kind === 'image') {
    const url = imageUrls.get(inline.id);
    return url ? `<img src="${escapeHtml(url)}">` : '';
  }
  let html = escapeHtml(inline.text);
  if (inline.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (inline.italic) {
    html = `<em>${html}</em>`;
  }
  if (inline.underline) {
    html = `<u>${html}</u>`;
  }
  if (inline.strike) {
    html = `<s>${html}</s>`;
  }
  if (inline.link && /^(https?:|mailto:)/i.test(inline.link)) {
    html = `<a href="${escapeHtml(inline.link)}">${html}</a>`;
  }
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
