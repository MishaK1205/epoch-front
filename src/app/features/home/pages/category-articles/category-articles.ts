import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';
import { ArticleListItem } from '../../components/article-list-item/article-list-item';

const PAGE_SIZE = 12;

/** Articles of one category: `/category/:slug?page=<n>`. */
@Component({
  selector: 'app-category-articles',
  imports: [Alert, Pagination, Spinner, ArticleListItem],
  templateUrl: './category-articles.html',
  styleUrls: ['../../feed-page.scss', './category-articles.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryArticles {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly router = inject(Router);

  readonly slug = input.required<string>();
  readonly page = input(1, { transform: toPage });

  protected readonly articles = rxResource({
    params: () => ({ category: this.slug(), page: this.page() }),
    stream: ({ params }) => this.articlesApi.listPublished({ ...params, limit: PAGE_SIZE }),
  });

  protected readonly category = computed(() => this.categoriesStore.findBySlug(this.slug()));
  protected readonly title = computed(() => this.category()?.name ?? this.slug());
  protected readonly description = computed(() => this.category()?.description ?? '');

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
  protected readonly totalPages = computed(() =>
    this.articles.hasValue() ? Math.ceil(this.articles.value().total / PAGE_SIZE) : 0,
  );
  protected readonly errorMessages = computed(() =>
    this.articles.error() ? getApiErrorMessages(this.articles.error()) : [],
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
