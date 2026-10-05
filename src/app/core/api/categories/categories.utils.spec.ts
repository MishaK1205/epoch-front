import { describe, expect, it } from 'vitest';
import { Category, CategoryBase } from './categories.models';
import {
  findCategoryById,
  findCategoryBySlug,
  flattenCategories,
  isSubcategory,
} from './categories.utils';

function base(id: string, parent: CategoryBase['parent'] = null): CategoryBase {
  return {
    id,
    name: id,
    slug: `${id}-slug`,
    parent,
    articleCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

const medieval = base('medieval', { id: 'history', name: 'history', slug: 'history-slug' });
const tree: Category[] = [
  { ...base('history'), subcategories: [medieval] },
  { ...base('science'), subcategories: [] },
];

describe('category utils', () => {
  it('flattens top-level categories followed by their subcategories', () => {
    expect(flattenCategories(tree).map((category) => category.id)).toEqual([
      'history',
      'medieval',
      'science',
    ]);
  });

  it('finds top-level categories and subcategories by id and slug', () => {
    expect(findCategoryById(tree, 'history')?.id).toBe('history');
    expect(findCategoryById(tree, 'medieval')).toBe(medieval);
    expect(findCategoryBySlug(tree, 'medieval-slug')).toBe(medieval);
    expect(findCategoryBySlug(tree, 'missing')).toBeUndefined();
  });

  it('tells subcategories apart by their parent', () => {
    expect(isSubcategory(medieval)).toBe(true);
    expect(isSubcategory(tree[0])).toBe(false);
  });
});
