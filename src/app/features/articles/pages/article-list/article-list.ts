import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { currentPageActive, navigationTick } from '../../../../core/services/active-page';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

/** Matches the design's three-column browse grid. */
const PAGE_SIZE = 12;
/** Title sort runs in the browser; the list endpoint is newest-first only. */
const TITLE_SORT_LIMIT = 100;
const TOPIC_TINTS = 8;

function toSort(value: unknown): 'newest' | 'title' {
  return value === 'title' ? 'title' : 'newest';
}

/**
 * Every published article: `/articles`, optionally `?category=<slug>` and `?sort=title`.
 * Declared before `/articles/:slug`.
 */
@Component({
  selector: 'app-article-list',
  imports: [RouterLink, Alert, ArticleCard, Icon, Pagination, ReadingListToggle, Spinner],
  templateUrl: './article-list.html',
  styleUrl: './article-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleList {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly navigation = navigationTick();
  private readonly pageActive = currentPageActive();
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);

  protected readonly readArticleIds = inject(ReadingListStore).readIds;
  protected readonly categories = this.categoriesStore.categories;

  readonly category = input<string>();
  readonly page = input(1, { transform: toPage });
  readonly sort = input('newest', { transform: toSort });

  protected readonly articles = rxResource({
    params: () => ({
      category: this.category() ?? '',
      page: this.sort() === 'title' ? 1 : this.page(),
      limit: this.sort() === 'title' ? TITLE_SORT_LIMIT : PAGE_SIZE,
    }),
    stream: ({ params }) => this.articlesApi.listPublished(params),
  });

  protected readonly selected = computed(() => {
    const slug = this.category();
    return slug ? this.categoriesStore.findBySlug(slug) : undefined;
  });

  protected readonly categoryIndex = computed(() => {
    const slug = this.selected()?.slug;
    const index = this.categories().findIndex((category) => category.slug === slug);
    return index < 0 ? 0 : index;
  });

  private readonly ordered = computed(() => {
    const items = this.articles.hasValue() ? this.articles.value().items : [];
    if (this.sort() !== 'title') {
      return items;
    }
    return [...items].sort((a, b) => a.title.localeCompare(b.title, 'ka'));
  });

  protected readonly items = computed(() => {
    const rows = this.ordered();
    if (this.sort() !== 'title') {
      return rows;
    }
    const start = (this.page() - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  });

  protected readonly total = computed(() =>
    this.articles.hasValue() ? this.articles.value().total : 0,
  );

  protected readonly totalPages = computed(() => {
    const count = this.sort() === 'title' ? this.ordered().length : this.total();
    return Math.ceil(count / PAGE_SIZE);
  });

  protected readonly errorMessages = computed(() =>
    this.articles.error() ? getApiErrorMessages(this.articles.error()) : [],
  );

  constructor() {
    effect(() => {
      this.navigation();
      if (!this.pageActive()) {
        return;
      }
      const category = this.selected();
      this.seo.update({
        title: category ? `${category.name} — Epoch` : 'სტატიები — Epoch',
        description: category?.description || 'გამოქვეყნებული სტატიები თემების მიხედვით.',
      });
    });
  }

  protected tintClass(index: number): string {
    return `tint-${index % TOPIC_TINTS}`;
  }

  protected monogram(name: string): string {
    return Array.from(name.trim())[0] ?? '';
  }

  protected filterQuery(slug?: string): Record<string, string> {
    const query: Record<string, string> = {};
    if (slug) {
      query['category'] = slug;
    }
    if (this.sort() === 'title') {
      query['sort'] = 'title';
    }
    return query;
  }

  protected setSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      queryParams: { sort: value === 'title' ? 'title' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
