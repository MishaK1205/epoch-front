import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CategoriesApi } from '../api/categories/categories-api';
import { Category } from '../api/categories/categories.models';

/** App-wide category list (header nav, footer, filters). Loaded once. */
@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly resource = rxResource({ stream: () => this.categoriesApi.list() });

  readonly categories = computed<Category[]>(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );

  findBySlug(slug: string): Category | undefined {
    return this.categories().find((category) => category.slug === slug);
  }

  reload(): void {
    this.resource.reload();
  }
}
