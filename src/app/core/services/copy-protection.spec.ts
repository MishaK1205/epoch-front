import { TestBed } from '@angular/core/testing';
import { CopyProtection, isCopyAllowed } from './copy-protection';

describe('isCopyAllowed', () => {
  afterEach(() => document.body.replaceChildren());

  function render(html: string): HTMLElement {
    document.body.innerHTML = html;
    return document.body;
  }

  it('blocks plain page text, including text nodes', () => {
    const body = render('<p id="p">text</p>');
    const paragraph = body.querySelector('#p')!;
    expect(isCopyAllowed(paragraph)).toBe(false);
    expect(isCopyAllowed(paragraph.firstChild)).toBe(false);
    expect(isCopyAllowed(null)).toBe(false);
  });

  it('allows form fields and editable content', () => {
    const body = render(
      '<input id="i" /><textarea id="t"></textarea><div contenteditable="true"><p id="e">x</p></div>',
    );
    expect(isCopyAllowed(body.querySelector('#i'))).toBe(true);
    expect(isCopyAllowed(body.querySelector('#t'))).toBe(true);
    expect(isCopyAllowed(body.querySelector('#e'))).toBe(true);
  });

  it('allows everything inside [data-allow-copy] but not contenteditable="false"', () => {
    const body = render(
      '<section data-allow-copy><p id="a">x</p></section><div contenteditable="false" id="f"></div>',
    );
    expect(isCopyAllowed(body.querySelector('#a'))).toBe(true);
    expect(isCopyAllowed(body.querySelector('#f'))).toBe(false);
  });
});

describe('CopyProtection', () => {
  afterEach(() => document.body.replaceChildren());

  it('cancels copy on page text and keeps it in inputs', () => {
    TestBed.inject(CopyProtection);
    document.body.innerHTML = '<p id="p">text</p><input id="i" />';

    const onText = new Event('copy', { bubbles: true, cancelable: true });
    document.querySelector('#p')!.dispatchEvent(onText);
    const onInput = new Event('copy', { bubbles: true, cancelable: true });
    document.querySelector('#i')!.dispatchEvent(onInput);

    expect(onText.defaultPrevented).toBe(true);
    expect(onInput.defaultPrevented).toBe(false);
  });
});
