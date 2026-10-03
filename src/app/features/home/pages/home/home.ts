import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';
import { ArticleHero } from '../../components/article-hero/article-hero';

const PAGE_SIZE = 13;
/** Compact teasers shown next to the lead card. */
const SIDE_ITEMS = 4;

/** Public article feed. Query params: `?tag=<tag>&page=<n>`. Categories live at `/category/:slug`. */
@Component({
  selector: 'app-home',
  imports: [Alert, Pagination, Spinner, ArticleHero, ArticleCard, ReadingListToggle],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly router = inject(Router);

  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly readArticleIds = inject(ReadingListStore).readIds;

  readonly tag = input<string>();
  readonly page = input(1, { transform: toPage });

  protected readonly articles = rxResource({
    params: () => ({ page: this.page(), tag: this.tag() }),
    stream: ({ params }) => this.articlesApi.listPublished({ ...params, limit: PAGE_SIZE }),
  });

  protected readonly heading = computed(() => {
    const tag = this.tag();
    return tag ? { kicker: 'თეგი', title: `#${tag}` } : null;
  });

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
  protected readonly featured = computed(() =>
    !this.heading() && this.page() === 1 ? (this.items()[0] ?? null) : null,
  );
  protected readonly listItems = computed(() =>
    this.featured() ? this.items().slice(1) : this.items(),
  );
  /** Latest section: one large lead card, a column of compact teasers, then the rest. */
  protected readonly lead = computed(() => this.listItems()[0] ?? null);
  protected readonly sideItems = computed(() => this.listItems().slice(1, 1 + SIDE_ITEMS));
  protected readonly restItems = computed(() => this.listItems().slice(1 + SIDE_ITEMS));
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
