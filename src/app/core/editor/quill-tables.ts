import type Quill from 'quill';
import type { Delta } from 'quill';
import { markdownTablesToHtml } from '../../shared/utils/markdown-table';

/**
 * Table paste support for an editor created with `modules: { table: true }`:
 * - `<th>` cells become bold cells (Quill only knows `<td>` and would merge a header row into
 *   one cell);
 * - plain text with Markdown tables (`| a | b |` + `|---|---|`) is pasted as real tables.
 *
 * Call once after creating the editor: `enableTablePaste(quill)`.
 */
export function enableTablePaste(quill: Quill): void {
  quill.clipboard.addMatcher('th', (_node, delta) => headerCell(delta));
  // Capture phase on the container runs before Quill's own paste listener on `quill.root`.
  quill.container.addEventListener('paste', (event) => pasteMarkdownTable(quill, event), true);
}

function headerCell(delta: Delta): Delta {
  for (const op of delta.ops) {
    if (typeof op.insert === 'string' && op.insert !== '\n') {
      op.attributes = { ...op.attributes, bold: true };
    }
  }
  const last = delta.ops.at(-1)?.insert;
  return typeof last === 'string' && last.endsWith('\n') ? delta : delta.insert('\n');
}

function pasteMarkdownTable(quill: Quill, event: ClipboardEvent): void {
  const data = event.clipboardData;
  if (!data || !quill.isEnabled() || data.getData('text/html').includes('<table')) {
    return;
  }
  const html = markdownTablesToHtml(data.getData('text/plain'));
  if (html === null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  quill.clipboard.onPaste(quill.getSelection(true), { html });
}
