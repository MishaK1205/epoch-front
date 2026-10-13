import { markdownTablesToHtml } from './markdown-table';

describe('markdownTablesToHtml', () => {
  it('returns null for text without a table', () => {
    expect(markdownTablesToHtml('just text\nwith a | pipe')).toBeNull();
  });

  it('converts a table with a bold header row and inline bold', () => {
    const text = [
      '| პიროვნება | წლები |',
      '|---|:---:|',
      '| **ვალენტი** | იმპერატორი, **364–378** |',
    ].join('\n');
    expect(markdownTablesToHtml(text)).toBe(
      '<table><tbody>' +
        '<tr><td><strong>პიროვნება</strong></td><td><strong>წლები</strong></td></tr>' +
        '<tr><td><strong>ვალენტი</strong></td><td>იმპერატორი, <strong>364–378</strong></td></tr>' +
        '</tbody></table>',
    );
  });

  it('keeps surrounding lines as paragraphs and escapes HTML', () => {
    const text = 'Intro <b>\n\na | b\n--|--\n1 | *x*\n\nAfter';
    expect(markdownTablesToHtml(text)).toBe(
      '<p>Intro &lt;b&gt;</p>' +
        '<table><tbody>' +
        '<tr><td><strong>a</strong></td><td><strong>b</strong></td></tr>' +
        '<tr><td>1</td><td><em>x</em></td></tr>' +
        '</tbody></table>' +
        '<p>After</p>',
    );
  });

  it('pads short rows, drops extra cells and keeps escaped pipes', () => {
    const text = '| a | b |\r\n|---|---|\r\n| 1 |\r\n| 2 | x \\| y | 3 |';
    expect(markdownTablesToHtml(text)).toBe(
      '<table><tbody>' +
        '<tr><td><strong>a</strong></td><td><strong>b</strong></td></tr>' +
        '<tr><td>1</td><td></td></tr>' +
        '<tr><td>2</td><td>x | y</td></tr>' +
        '</tbody></table>',
    );
  });
});
