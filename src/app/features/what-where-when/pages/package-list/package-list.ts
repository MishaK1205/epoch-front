import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  API_LIMITS,
  getApiErrorMessages,
  WhatWhereWhenApi,
  WhatWhereWhenCategoriesApi,
} from '../../../../core/api';
import { CalendarDatePipe } from '../../../../shared/pipes/calendar-date-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;

/** `/what-where-when?page=&categoryId=` — every package, newest date first; opens its questions. */
@Component({
  selector: 'app-package-list',
  imports: [RouterLink, CalendarDatePipe, Alert, Button, EmptyState, Pagination, Spinner],
  templateUrl: './package-list.html',
  styleUrl: './package-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageList {
  private readonly api = inject(WhatWhereWhenApi);
  private readonly categoriesApi = inject(WhatWhereWhenCategoriesApi);
  private readonly router = inject(Router);

  readonly page = input(1, { transform: toPage });
  readonly categoryId = input<string>();

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly categoryChips = computed(() =>
    this.categories.hasValue()
      ? this.categories.value().filter((category) => category.packageCount > 0)
      : [],
  );

  protected readonly packages = rxResource({
    params: () => ({ page: this.page(), categoryId: this.categoryId() }),
    stream: ({ params }) => this.api.list({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly items = computed(() =>
    this.packages.hasValue()
      ? this.packages.value().items.map((item) => ({ item, authors: item.authors.join(', ') }))
      : [],
  );
  protected readonly totalPages = computed(() =>
    this.packages.hasValue() ? Math.ceil(this.packages.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.packages.error() ? getApiErrorMessages(this.packages.error()) : [],
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.packages.reload();
  }
}
