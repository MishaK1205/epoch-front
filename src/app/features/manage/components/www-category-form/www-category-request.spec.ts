import { describe, expect, it } from 'vitest';
import { WhatWhereWhenCategory } from '../../../../core/api/what-where-when/what-where-when.models';
import { toCreateWwwCategoryRequest, toUpdateWwwCategoryRequest } from './www-category-request';

const CATEGORY: WhatWhereWhenCategory = {
  id: '6ac654618280bf721188b701',
  name: 'Autumn cup',
  description: 'Rounds',
  packageCount: 1,
  createdAt: '2026-10-07T14:17:05.548Z',
  updatedAt: '2026-10-07T14:17:05.548Z',
};

describe('toCreateWwwCategoryRequest', () => {
  it('omits an empty description', () => {
    expect(toCreateWwwCategoryRequest({ name: 'x', description: '' })).toEqual({ name: 'x' });
    expect(toCreateWwwCategoryRequest({ name: 'x', description: 'y' })).toEqual({
      name: 'x',
      description: 'y',
    });
  });
});

describe('toUpdateWwwCategoryRequest', () => {
  it('sends only the changed fields; an empty description clears it', () => {
    expect(toUpdateWwwCategoryRequest(CATEGORY, { name: 'Autumn cup', description: '' })).toEqual({
      description: '',
    });
    expect(
      toUpdateWwwCategoryRequest(CATEGORY, { name: 'Spring cup', description: 'Rounds' }),
    ).toEqual({ name: 'Spring cup' });
    expect(
      toUpdateWwwCategoryRequest(CATEGORY, { name: 'Autumn cup', description: 'Rounds' }),
    ).toEqual({});
  });
});
