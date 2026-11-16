import type Quill from 'quill';
import Delta from 'quill-delta';
import { collapseBlankParagraphs, enableParagraphPaste } from './quill-paragraphs';

describe('collapseBlankParagraphs', () => {
  it('returns the same delta when paragraphs are already single-spaced', () => {
    const delta = new Delta().insert('One\nTwo');
    expect(collapseBlankParagraphs(delta)).toBe(delta);
  });

  it('drops a blank line between paragraphs', () => {
    expect(collapseBlankParagraphs(new Delta().insert('One\n\nTwo')).ops).toEqual(
      new Delta().insert('One\nTwo').ops,
    );
  });

  it('drops several blank lines and a whitespace-only line', () => {
    expect(collapseBlankParagraphs(new Delta().insert('One\n\n \n\nTwo')).ops).toEqual(
      new Delta().insert('One\nTwo').ops,
    );
  });

  it('drops a trailing whitespace paragraph without a following break', () => {
    expect(collapseBlankParagraphs(new Delta().insert('One\n ')).ops).toEqual(
      new Delta().insert('One').ops,
    );
  });

  it('keeps bold text and drops the blank line inside it', () => {
    expect(collapseBlankParagraphs(new Delta().insert('One\n\nTwo\n', { bold: true })).ops).toEqual(
      new Delta().insert('One\nTwo\n', { bold: true }).ops,
    );
  });

  it('keeps a heading break in front of a trailing blank line', () => {
    const delta = new Delta().insert('Title').insert('\n', { header: 2 }).insert(' ');
    expect(collapseBlankParagraphs(delta).ops).toEqual(
      new Delta().insert('Title').insert('\n', { header: 2 }).ops,
    );
  });

  it('keeps an empty list item and an empty table cell', () => {
    const list = new Delta()
      .insert('one')
      .insert('\n', { list: 'bullet' })
      .insert('\n', { list: 'bullet' })
      .insert('two')
      .insert('\n', { list: 'bullet' });
    expect(collapseBlankParagraphs(list)).toBe(list);

    const table = new Delta()
      .insert('\n', { table: 'row-1' })
      .insert('cell')
      .insert('\n', { table: 'row-1' });
    expect(collapseBlankParagraphs(table)).toBe(table);
  });

  it('drops a plain blank line around a table and keeps the cells', () => {
    const delta = new Delta()
      .insert('Intro')
      .insert('\n')
      .insert('\n')
      .insert('a')
      .insert('\n', { table: 'row-1' })
      .insert('\n', { table: 'row-2' })
      .insert('After');
    expect(collapseBlankParagraphs(delta).ops).toEqual(
      new Delta()
        .insert('Intro')
        .insert('\n')
        .insert('a')
        .insert('\n', { table: 'row-1' })
        .insert('\n', { table: 'row-2' })
        .insert('After').ops,
    );
  });
});

describe('enableParagraphPaste', () => {
  let quill: Quill;

  beforeAll(() => {
    // jsdom ranges have no layout box. Quill scrolls the caret after a paste.
    if (!Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = () => new DOMRect();
    }
  });

  beforeEach(async () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const { default: QuillEditor } = await import('quill');
    quill = new QuillEditor('#editor', { theme: 'snow', modules: { table: true } });
    enableParagraphPaste(quill);
  });

  it('pastes plain text with blank lines as single paragraph breaks', () => {
    paste(quill, '', 'One\n\nTwo\n\nThree');
    expect(quill.root.innerHTML).toBe('<p>One</p><p>Two</p><p>Three</p>');
  });

  it('pastes a Word-style non-breaking space paragraph as one break', () => {
    paste(
      quill,
      '<p class="MsoNormal">One</p><p class="MsoNormal">&nbsp;</p><p class="MsoNormal">Two</p>',
      'One\n\nTwo',
    );
    expect(quill.root.innerHTML).toBe('<p>One</p><p>Two</p>');
  });

  it("leaves a single-spaced paste on Quill's own path", () => {
    paste(quill, '<p>One</p><p>Two</p>', 'One\nTwo');
    expect(quill.root.innerHTML).toBe('<p>One</p><p>Two</p>');
  });

  it('pastes into the middle of a sentence without an extra break', () => {
    quill.setText('HelloWorld');
    paste(quill, '', 'One\n\nTwo', 5);
    expect(quill.getText()).toBe('HelloOne\nTwoWorld\n');
  });

  it('does not change a blank line already stored in the document', () => {
    quill.setContents(quill.clipboard.convert({ html: '<p>One</p><p><br></p><p>Two</p>' }), 'api');
    expect(quill.root.innerHTML).toBe('<p>One</p><p><br></p><p>Two</p>');
  });
});

function paste(quill: Quill, html: string, text: string, index = 0): void {
  quill.setSelection(index, 0);
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData(type: string): string {
        if (type === 'text/html') {
          return html;
        }
        return type === 'text/plain' ? text : '';
      },
      files: [],
    },
  });
  quill.root.dispatchEvent(event);
}
