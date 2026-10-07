import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { isRichTextEmpty } from './rich-text-required';
import { notBlank } from './not-blank';
import { realDate } from './real-date';

describe('realDate', () => {
  it('rejects 2026-02-30 and accepts 2024-02-29', () => {
    expect(realDate(new FormControl('2026-02-30'))).toEqual({ realDate: true });
    expect(realDate(new FormControl('2024-02-29'))).toBeNull();
  });

  it('leaves empty values and other formats to other validators', () => {
    expect(realDate(new FormControl(''))).toBeNull();
    expect(realDate(new FormControl('07.10.2026'))).toBeNull();
  });
});

describe('notBlank', () => {
  it('rejects whitespace-only strings', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlank(new FormControl(' a '))).toBeNull();
    expect(notBlank(new FormControl(''))).toBeNull();
  });
});

describe('isRichTextEmpty (Quill output)', () => {
  it('treats the empty editor as empty, images and text as content', () => {
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
    expect(isRichTextEmpty('<p><img src="x"></p>')).toBe(false);
    expect(isRichTextEmpty('<p>a</p>')).toBe(false);
  });
});
