import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { TagsApi } from '../../../../core/api/tags/tags-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { HighlightText } from '../../../../shared/ui/highlight-text/highlight-text';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { matchingTags, normalizeSearchQuery } from '../../../../shared/utils/highlight';
import { toPage } from '../../../../shared/utils/page-param';

const PAGE_SIZE = 12;
const POPULAR_TAGS_LIMIT = 10;
const SEARCH_ERROR_MESSAGE = 'ძიება ახლა ვერ მოხერხდა. სცადეთ თავიდან.';

/**
 * `/search?q=<text>&page=<n>`: partial title / tag search (`GET /articles/search`). The URL is
 * the source of truth; a blank `q` shows the start state without calling the API.
 */
@Component({
  selector: 'app-search-results',
  imports: [
    RouterLink,
    Alert,
    ArticleCard,
    Button,
    EmptyState,
    HighlightText,
    Icon,
    Pagination,
    Spinner,
    ReadingListToggle,
  ],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly tagsApi = inject(TagsApi);
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);

  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly readArticleIds = inject(ReadingListStore).readIds;
  protected readonly maxLength = API_LIMITS.search.max;

  readonly q = input<string>();
  readonly page = input(1, { transform: toPage });

  protected readonly query = computed(() => normalizeSearchQuery(this.q() ?? ''));
  protected readonly draft = linkedSignal(() => this.q() ?? '');

  protected readonly results = rxResource({
    params: () => {
      const q = this.query();
      return q ? { q, page: this.page(), limit: PAGE_SIZE } : undefined;
    },
    stream: ({ params }) => this.articlesApi.search(params),
  });

  protected readonly total = computed(() =>
    this.results.hasValue() ? this.results.value().total : 0,
  );
  protected readonly totalPages = computed(() => {
    if (!this.results.hasValue()) {
      return 0;
    }
    const { total, limit } = this.results.value();
    return Math.ceil(total / limit);
  });
  protected readonly items = computed(() => {
    if (!this.results.hasValue()) {
      return [];
    }
    const q = this.query();
    return this.results
      .value()
      .items.map((article) => ({ article, tags: matchingTags(article.tags, q) }));
  });
  protected readonly noResults = computed(
    () => this.results.hasValue() && this.results.value().total === 0,
  );
  protected readonly error = computed(() => {
    const error = this.results.error();
    if (!error) {
      return null;
    }
    return error instanceof HttpErrorResponse && error.status === 400
      ? { messages: getApiErrorMessages(error), retry: false }
      : { messages: [SEARCH_ERROR_MESSAGE], retry: true };
  });

  protected readonly popularTags = rxResource({
    params: () => (this.noResults() ? { limit: POPULAR_TAGS_LIMIT } : undefined),
    stream: ({ params }) => this.tagsApi.list(params),
  });

  constructor() {
    effect(() => {
      const q = this.query();
      this.seo.update({
        title: q ? `ძიება: ${q} — Epoch` : 'ძიება — Epoch',
        description: 'მოძებნეთ Epoch-ის სტატიები სათაურით ან თეგით.',
      });
    });

    // A page past the end (e.g. an old link): jump to the last page.
    effect(() => {
      if (!this.results.hasValue()) {
        return;
      }
      const { items, total, limit } = this.results.value();
      if (items.length === 0 && total > 0) {
        void this.router.navigate([], {
          queryParams: { page: Math.ceil(total / limit) },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const q = normalizeSearchQuery(this.draft());
    if (q) {
      void this.router.navigate(['/search'], { queryParams: { q } });
    }
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }

  protected retry(): void {
    this.results.reload();
  }
}
