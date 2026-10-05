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
import { finalize, Observable } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { ArticleSummary } from '../../../../core/api/articles/articles.models';
import { ARTICLE_STATUSES, ArticleStatus } from '../../../../core/api/common.models';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Select, SelectOption, SelectOptionGroup } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { ArticleRow } from '../../components/article-row/article-row';
import { getManageErrorMessages } from '../../manage-errors';
import { ARTICLE_DELETED_STATE_KEY, toPage } from '../../manage-labels';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const DELETED_MESSAGE = 'სტატია წაიშალა.';

const STATUS_FILTERS: readonly { label: string; value: ArticleStatus | null }[] = [
  { label: 'ყველა', value: null },
  { label: 'დრაფტები', value: 'draft' },
  { label: 'გამოქვეყნებული', value: 'published' },
];

function toStatus(value: string | undefined): ArticleStatus | undefined {
  return ARTICLE_STATUSES.find((status) => status === value);
}

/**
 * `/manage/articles?status=&categoryId=&page=` — moderators see their own articles, admins see
 * all. `categoryId` may be a category or a subcategory.
 */
@Component({
  selector: 'app-manage-articles',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    Pagination,
    Select,
    Spinner,
    ArticleRow,
  ],
  templateUrl: './manage-articles.html',
  styleUrl: '../../manage-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageArticles {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly page = input(1, { transform: toPage });
  readonly status = input(undefined, { transform: toStatus });
  readonly categoryId = input<string>();

  protected readonly filters = STATUS_FILTERS;
  protected readonly categoryFilter = new FormControl('', { nonNullable: true });
  /** A category with subcategories becomes a group: the category itself, then each child. */
  protected readonly categoryOptions = computed<(SelectOption | SelectOptionGroup)[]>(() =>
    this.categoriesStore.categories().map((category) =>
      category.subcategories.length === 0
        ? { value: category.id, label: category.name }
        : {
            group: category.name,
            options: [
              { value: category.id, label: `${category.name} — ყველა` },
              ...category.subcategories.map((subcategory) => ({
                value: subcategory.id,
                label: subcategory.name,
              })),
            ],
          },
    ),
  );
  protected readonly articles = rxResource({
    params: () => ({ page: this.page(), status: this.status(), categoryId: this.categoryId() }),
    stream: ({ params }) => this.articlesApi.listManaged({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly filtered = computed(() => !!this.status() || !!this.categoryId());

  protected readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[ARTICLE_DELETED_STATE_KEY] === true
      ? DELETED_MESSAGE
      : '',
  );
  protected readonly toDelete = signal<ArticleSummary | null>(null);

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
  protected readonly rows = computed(() =>
    this.items().map((article) => ({ article, pending: this.pendingIds().has(article.id) })),
  );
  protected readonly totalPages = computed(() =>
    this.articles.hasValue() ? Math.ceil(this.articles.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.articles.error() ? getManageErrorMessages(this.articles.error()) : [],
  );
  protected readonly deleteMessage = computed(
    () =>
      `„${this.toDelete()?.title ?? ''}“ სამუდამოდ წაიშლება. ამ მოქმედების გაუქმება შეუძლებელია.`,
  );

  constructor() {
    effect(() => this.categoryFilter.setValue(this.categoryId() ?? '', { emitEvent: false }));
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }

  protected filterByCategory(categoryId: string): void {
    void this.router.navigate([], {
      queryParams: { categoryId: categoryId || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected publish(article: ArticleSummary): void {
    this.run(article, this.articlesApi.publish(article.id), 'სტატია გამოქვეყნდა.');
  }

  protected unpublish(article: ArticleSummary): void {
    this.run(article, this.articlesApi.unpublish(article.id), 'სტატია დაბრუნდა დრაფტებში.');
  }

  protected askDelete(article: ArticleSummary): void {
    this.toDelete.set(article);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const article = this.toDelete();
    if (article) {
      this.run(article, this.articlesApi.delete(article.id), DELETED_MESSAGE);
    }
  }

  private run(article: ArticleSummary, request: Observable<unknown>, message: string): void {
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.setPending(article.id, true);
    request
      .pipe(
        finalize(() => this.setPending(article.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(message);
          this.articles.reload();
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }

  private setPending(id: string, pending: boolean): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
