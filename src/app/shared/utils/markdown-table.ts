const SEPARATOR_CELL = /^:?-+:?$/;

/**
 * Converts plain text that contains Markdown tables (`| a | b |` + `|---|---|`) into HTML:
 * tables become `<table>` (header cells bold), other non-empty lines become paragraphs.
 * `**bold**` and `*italic*` are kept. Returns `null` when the text has no table.
 */
export function markdownTablesToHtml(text: string): string | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let hasTable = false;
  let index = 0;

  while (index < lines.length) {
    const header = splitRow(lines[index]);
    const separator = index + 1 < lines.length ? splitRow(lines[index + 1]) : null;
    if (header && separator && isSeparator(separator)) {
      const rows: string[][] = [];
      index += 2;
      for (let row = splitRow(lines[index] ?? ''); row; row = splitRow(lines[index] ?? '')) {
        rows.push(row);
        index += 1;
      }
      blocks.push(tableHtml(header, rows));
      hasTable = true;
      continue;
    }
    const line = lines[index].trim();
    if (line) {
      blocks.push(`<p>${inlineHtml(line)}</p>`);
    }
    index += 1;
  }

  return hasTable ? blocks.join('') : null;
}

/** Cells of a `| a | b |` line, or `null` when the line is not a table row. */
function splitRow(line: string): string[] | null {
  let value = line.trim();
  if (!value.includes('|')) {
    return null;
  }
  if (value.startsWith('|')) {
    value = value.slice(1);
  }
  if (value.endsWith('|') && !value.endsWith('\\|')) {
    value = value.slice(0, -1);
  }
  return value.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isSeparator(cells: string[]): boolean {
  return cells.every((cell) => SEPARATOR_CELL.test(cell));
}

function tableHtml(header: string[], rows: string[][]): string {
  const columns = header.length;
  const row = (cells: string[], bold: boolean): string => {
    const html = Array.from({ length: columns }, (_, column) => {
      const content = inlineHtml(cells[column] ?? '');
      return `<td>${bold && content ? `<strong>${content}</strong>` : content}</td>`;
    });
    return `<tr>${html.join('')}</tr>`;
  };
  return `<table><tbody>${[row(header, true), ...rows.map((cells) => row(cells, false))].join('')}</tbody></table>`;
}

function inlineHtml(markdown: string): string {
  return escapeHtml(markdown.replace(/<br\s*\/?>/gi, ' '))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
