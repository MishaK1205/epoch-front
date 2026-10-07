import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { WhatWhereWhenApi } from '../../../../core/api/what-where-when/what-where-when-api';
import { WhatWhereWhenCategoriesApi } from '../../../../core/api/what-where-when/what-where-when-categories-api';
import { WhatWhereWhenSummary } from '../../../../core/api/what-where-when/what-where-when.models';
import { CalendarDatePipe } from '../../../../shared/pipes/calendar-date-pipe';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import {
  toPage,
  WWW_CATEGORIES_URL,
  WWW_PACKAGE_DELETED_STATE_KEY,
  wwwPackageDeleteMessage,
} from '../../manage-labels';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const DELETED_MESSAGE = 'პაკეტი წაიშალა.';
const ALREADY_DELETED_MESSAGE = 'პაკეტი უკვე წაშლილი იყო. სია განახლდა.';
const UNKNOWN_CATEGORY_LABEL = 'წაშლილი ან უცნობი კატეგორია';

/**
 * `/manage/what-where-when?page=&categoryId=` — "What? Where? When?" packages, newest date first,
 * optionally only one category.
 */
@Component({
  selector: 'app-www-packages',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CalendarDatePipe,
    TimeAgoPipe,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    Pagination,
    Select,
    Spinner,
  ],
  templateUrl: './www-packages.html',
  styleUrls: ['../../manage-page.scss', './www-packages.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwPackages {
  private readonly api = inject(WhatWhereWhenApi);
  private readonly categoriesApi = inject(WhatWhereWhenCategoriesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly page = input(1, { transform: toPage });
  readonly categoryId = input<string>();

  protected readonly categoriesUrl = WWW_CATEGORIES_URL;
  protected readonly categoryFilter = new FormControl('', { nonNullable: true });
  /** Loaded every time the page opens, so counts and names are current. */
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  /** The URL filters by a category that isn't in the list (deleted, or a bad link). */
  protected readonly unknownCategory = computed(() => {
    const id = this.categoryId();
    return (
      !!id &&
      this.categories.hasValue() &&
      !this.categories.value().some((category) => category.id === id)
    );
  });
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const options = (this.categories.hasValue() ? this.categories.value() : []).map((category) => ({
      value: category.id,
      label: `${category.name} (${category.packageCount})`,
    }));
    const id = this.categoryId();
    return id && this.unknownCategory()
      ? [...options, { value: id, label: UNKNOWN_CATEGORY_LABEL }]
      : options;
  });

  protected readonly packages = rxResource({
    params: () => ({ page: this.page(), categoryId: this.categoryId() }),
    stream: ({ params }) => this.api.list({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly items = computed(() =>
    this.packages.hasValue() ? this.packages.value().items : [],
  );
  protected readonly rows = computed(() =>
    this.items().map((item) => ({ item, authors: item.authors.join(', ') || '—' })),
  );
  /** "New package" preselects the filtered category. */
  protected readonly newPackageParams = computed(() => ({ categoryId: this.categoryId() || null }));
  protected readonly totalPages = computed(() =>
    this.packages.hasValue() ? Math.ceil(this.packages.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.packages.error() ? getManageErrorMessages(this.packages.error()) : [],
  );

  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<WhatWhereWhenSummary | null>(null);
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[WWW_PACKAGE_DELETED_STATE_KEY] === true
      ? DELETED_MESSAGE
      : '',
  );
  protected readonly deleteMessage = computed(() =>
    wwwPackageDeleteMessage(this.toDelete()?.name ?? ''),
  );

  constructor() {
    effect(() => this.categoryFilter.setValue(this.categoryId() ?? '', { emitEvent: false }));
    // A page past the end (e.g. after deleting the last item on it): go to the last page.
    effect(() => {
      if (!this.packages.hasValue()) {
        return;
      }
      const { items, total } = this.packages.value();
      const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (items.length === 0 && total > 0 && this.page() > lastPage) {
        this.goToPage(lastPage, true);
      }
    });
  }

  protected goToPage(page: number, replaceUrl = false): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  /** `''` ("All categories") removes the param; any change goes back to page 1. */
  protected filterByCategory(categoryId: string): void {
    void this.router.navigate([], {
      queryParams: { categoryId: categoryId || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.packages.reload();
  }

  protected askDelete(pkg: WhatWhereWhenSummary): void {
    this.toDelete.set(pkg);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const pkg = this.toDelete();
    if (!pkg || this.pendingId()) {
      return;
    }
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.pendingId.set(pkg.id);
    this.api
      .delete(pkg.id)
      .pipe(
        finalize(() => this.pendingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(DELETED_MESSAGE);
          this.packages.reload();
          this.categories.reload();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.successMessage.set(ALREADY_DELETED_MESSAGE);
            this.packages.reload();
            this.categories.reload();
          } else {
            this.actionErrors.set(getManageErrorMessages(err));
          }
        },
      });
  }
}
