import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { CategoriesApi } from '../api/categories/categories-api';
import { Category, CategoryBase } from '../api/categories/categories.models';
import { findCategoryBySlug } from '../api/categories/categories.utils';
import { AuthService } from '../auth/auth-service';

/**
 * App-wide category tree (header nav, footer, filters, editor pickers). Loaded once; call
 * `reload()` after any category create / update / delete.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly auth = inject(AuthService);
  /** The header and footer inject this store on the login page too, so don't call the API yet. */
  private readonly resource = rxResource({
    params: () => this.auth.isLoggedIn(),
    stream: ({ params: loggedIn }) => (loggedIn ? this.categoriesApi.list() : of([])),
  });

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
