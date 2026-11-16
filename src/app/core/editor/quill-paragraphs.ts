import type Quill from 'quill';
import type Delta from 'quill-delta';
import type { AttributeMap } from 'quill-delta';

/**
 * Formats that use a blank line as structure. Dropping one would merge or delete a cell.
 * Anything else that is only whitespace is the extra gap paste inserts between paragraphs.
 */
const STRUCTURAL_BLANK = ['list', 'table', 'code-block'];

/**
 * Pasted text often separates paragraphs with a blank line (`<p><br></p>`, `&nbsp;`,
 * or `\n\n` in plain text). Quill keeps that line, so the gap is twice a paragraph break
 * typed in the editor. Drop those blank paragraphs on paste. Blank list items and table
 * cells stay. Saved HTML loaded through `clipboard.convert` is left as stored.
 *
 * Call once after creating the editor: `enableParagraphPaste(quill)`.
 */
export function enableParagraphPaste(quill: Quill): void {
  // Capture on `quill.root` runs after the container listener (Markdown tables) and before
  // Quill's own paste listener. `preventDefault` makes that listener return.
  quill.root.addEventListener(
    'paste',
    (event: ClipboardEvent) => pasteParagraphs(quill, event),
    true,
  );
}

/**
 * Removes blank paragraphs from a clipboard delta. Returns the same delta when nothing changed.
 * A trailing whitespace-only line is removed too, without eating a formatted block break
 * (a heading's newline) that sits in front of it.
 */
export function collapseBlankParagraphs(delta: Delta): Delta {
  const lines: { line: Delta; attributes: AttributeMap }[] = [];
  delta.eachLine((line, attributes) => {
    lines.push({ line, attributes });
  });
  if (lines.length === 0) {
    return delta;
  }

  const partial = !endsWithNewline(delta);
  let dropped = false;
  let result = newDelta(delta);
  lines.forEach((entry, index) => {
    const isPartial = partial && index === lines.length - 1;
    if (isBlankLine(entry.line) && !keepsBlankLine(entry.attributes)) {
      dropped = true;
      return;
    }
    result = result.concat(entry.line);
    if (!isPartial) {
      const attributes = Object.keys(entry.attributes).length > 0 ? entry.attributes : undefined;
      result = result.insert('\n', attributes);
    }
  });
  if (!dropped) {
    return delta;
  }
  return partial ? withoutTrailingPlainBreak(result) : result;
}

function pasteParagraphs(quill: Quill, event: ClipboardEvent): void {
  if (event.defaultPrevented || !quill.isEnabled()) {
    return;
  }
  const data = event.clipboardData;
  if (!data || shouldUploadFiles(data)) {
    return;
  }
  const range = quill.getSelection(true);
  if (range == null) {
    return;
  }
  const pasted = quill.clipboard.convert(
    { html: data.getData('text/html'), text: data.getData('text/plain') },
    quill.getFormat(range.index),
  );
  const collapsed = collapseBlankParagraphs(pasted);
  if (collapsed === pasted) {
    return;
  }
  event.preventDefault();
  const change = newDelta(pasted).retain(range.index).delete(range.length).concat(collapsed);
  quill.updateContents(change, 'user');
  quill.setSelection(change.length() - range.length, 'silent');
  quill.scrollSelectionIntoView();
}

/** Image files are Quill's uploader; a single pasted `<img>` is one too. */
function shouldUploadFiles(data: DataTransfer): boolean {
  const files = data.files ? Array.from(data.files) : [];
  if (files.length === 0) {
    return false;
  }
  const html = data.getData('text/html');
  if (!html) {
    return true;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.childElementCount === 1 && doc.body.firstElementChild?.tagName === 'IMG';
}

function newDelta(sample: Delta): Delta {
  return new (sample.constructor as new () => Delta)();
}

function endsWithNewline(delta: Delta): boolean {
  const last = delta.ops[delta.ops.length - 1];
  return typeof last?.insert === 'string' && last.insert.endsWith('\n');
}

function isBlankLine(line: Delta): boolean {
  return line.ops.every((op) => typeof op.insert === 'string' && op.insert.trim() === '');
}

function keepsBlankLine(attributes: AttributeMap): boolean {
  return STRUCTURAL_BLANK.some((name) => attributes[name] != null);
}

/** Drops a plain paragraph break left behind by a removed trailing blank line. */
function withoutTrailingPlainBreak(result: Delta): Delta {
  if (!endsWithNewline(result)) {
    return result;
  }
  const last = result.ops[result.ops.length - 1];
  if (typeof last?.insert !== 'string' || last.attributes != null) {
    return result;
  }
  return result.compose(
    newDelta(result)
      .retain(result.length() - 1)
      .delete(1),
  );
}
