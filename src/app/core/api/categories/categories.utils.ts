import { Category, CategoryBase } from './categories.models';

/** Top-level categories and all subcategories in one flat list. */
export function flattenCategories(categories: readonly Category[]): CategoryBase[] {
  return categories.flatMap((category) => [category, ...category.subcategories]);
}

export function findCategoryById(
  categories: readonly Category[],
  id: string,
): CategoryBase | undefined {
  return flattenCategories(categories).find((category) => category.id === id);
}

export function findCategoryBySlug(
  categories: readonly Category[],
  slug: string,
): CategoryBase | undefined {
  return flattenCategories(categories).find((category) => category.slug === slug);
}

export function isSubcategory(category: CategoryBase): boolean {
  return category.parent !== null;
}
