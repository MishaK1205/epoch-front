import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CategoriesApi } from '../api/categories/categories-api';
import { Category, CategoryBase } from '../api/categories/categories.models';
import { findCategoryBySlug } from '../api/categories/categories.utils';

/**
 * App-wide category tree (header nav, footer, filters, editor pickers). Loaded once; call
 * `reload()` after any category create / update / delete.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly resource = rxResource({ stream: () => this.categoriesApi.list() });

  /** Top-level categories, each with its `subcategories`. */
  readonly categories = computed<Category[]>(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );

  /** A category or a subcategory. */
  findBySlug(slug: string): CategoryBase | undefined {
    return findCategoryBySlug(this.categories(), slug);
  }

  /** Only top-level categories (with their `subcategories`). */
  findTopLevelById(id: string): Category | undefined {
    return this.categories().find((category) => category.id === id);
  }

  reload(): void {
    this.resource.reload();
  }
}
