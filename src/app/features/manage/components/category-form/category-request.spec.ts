import { describe, expect, it } from 'vitest';
import { CategoryBase } from '../../../../core/api/categories/categories.models';
import { toCreateCategoryRequest, toUpdateCategoryRequest } from './category-request';

const medieval: CategoryBase = {
  id: 's1',
  name: 'Medieval',
  slug: 'medieval',
  parent: { id: 'c1', name: 'History', slug: 'history' },
  articleCount: 2,
  createdAt: '',
  updatedAt: '',
};

describe('category requests', () => {
  it('omits parentId for "None" (top-level) and an empty description', () => {
    expect(toCreateCategoryRequest({ name: 'History', description: '', parentId: '' })).toEqual({
      name: 'History',
    });
  });

  it('sends parentId when creating a subcategory', () => {
    expect(
      toCreateCategoryRequest({ name: 'Medieval', description: 'Middle Ages', parentId: 'c1' }),
    ).toEqual({ name: 'Medieval', description: 'Middle Ages', parentId: 'c1' });
  });

  it('never sends parentId on update, only changed fields', () => {
    const diff = toUpdateCategoryRequest(medieval, {
      name: 'Middle Ages',
      description: '',
      parentId: 'other',
    });

    expect(diff).toEqual({ name: 'Middle Ages' });
    expect('parentId' in diff).toBe(false);
  });
});
