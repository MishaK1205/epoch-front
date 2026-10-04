import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

const PAGE_SIZE = 12;

/** Articles of one category: `/category/:slug?page=<n>`. */
@Component({
  selector: 'app-category-articles',
  imports: [Alert, Pagination, Spinner, ArticleCard, ReadingListToggle],
  templateUrl: './category-articles.html',
  styleUrl: './category-articles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryArticles {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);

  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly readArticleIds = inject(ReadingListStore).readIds;

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

  constructor() {
    effect(() => {
      const category = this.category();
      if (category) {
        this.seo.update({
          title: `${category.name} — Epoch`,
          description: category.description || `${category.name} — სტატიები Epoch-ზე.`,
        });
      }
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
