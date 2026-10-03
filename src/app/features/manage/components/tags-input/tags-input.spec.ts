import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { tagListValidator } from '../../../../shared/validators/tag-list';
import { mergeTags, parseTags } from './tags-input';

describe('parseTags', () => {
  it('splits on commas, trims, lowercases and drops empty parts', () => {
    expect(parseTags('  History, ROME ,, ანტიკური  ')).toEqual(['history', 'rome', 'ანტიკური']);
  });
});

describe('mergeTags', () => {
  it('adds new tags without duplicates', () => {
    expect(mergeTags(['rome'], 'Rome, greece, greece')).toEqual(['rome', 'greece']);
  });

  it('stops at the max count', () => {
    expect(mergeTags(['a', 'b'], 'c, d, e', 3)).toEqual(['a', 'b', 'c']);
  });
});

describe('tagListValidator', () => {
  const validator = tagListValidator({ maxCount: 3, minLength: 1, maxLength: 5 });

  it('accepts a valid list', () => {
    expect(validator(new FormControl(['a', 'bc']))).toBeNull();
  });

  it('rejects too many tags', () => {
    expect(validator(new FormControl(['a', 'b', 'c', 'd']))).toEqual({
      maxTags: { max: 3, actual: 4 },
    });
  });

  it('rejects tags that are empty after trimming or too long', () => {
    expect(validator(new FormControl(['  ']))).toEqual({
      tagLength: { min: 1, max: 5, tag: '  ' },
    });
    expect(validator(new FormControl(['toolong']))).not.toBeNull();
  });
});
