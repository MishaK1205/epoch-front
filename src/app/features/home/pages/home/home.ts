import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';
import { ArticleHero } from '../../components/article-hero/article-hero';
import { ArticleSection } from '../../components/article-section/article-section';
import { CategorySection } from '../../components/category-section/category-section';

/** Front page: the hero plus the 5 articles of the "უახლესი სტატიები" section. */
const HOME_SIZE = 6;
/** Tag feed (`?tag=`): paginated teaser grid. */
const TAG_PAGE_SIZE = 12;

/**
 * Public front page: hero, the 5 latest articles, then one section per category.
 * `?tag=<tag>&page=<n>` switches to a paginated tag feed. Categories live at `/category/:slug`.
 */
@Component({
  selector: 'app-home',
  imports: [
    Alert,
    Pagination,
    Spinner,
    ArticleHero,
    ArticleCard,
    ArticleSection,
    CategorySection,
    ReadingListToggle,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly router = inject(Router);

  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly readArticleIds = inject(ReadingListStore).readIds;
  protected readonly categories = inject(CategoriesStore).categories;

  readonly tag = input<string>();
  readonly page = input(1, { transform: toPage });

  protected readonly articles = rxResource({
    params: () => {
      const tag = this.tag();
      return tag ? { tag, page: this.page(), limit: TAG_PAGE_SIZE } : { limit: HOME_SIZE };
    },
    stream: ({ params }) => this.articlesApi.listPublished(params),
  });

  protected readonly heading = computed(() => {
    const tag = this.tag();
    return tag ? { kicker: 'თეგი', title: `#${tag}` } : null;
  });

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
  /** Front page only: the newest article fills the hero, the next 5 the latest section. */
  protected readonly featured = computed(() => (this.heading() ? null : (this.items()[0] ?? null)));
  protected readonly latest = computed(() => this.items().slice(1, HOME_SIZE));
  protected readonly totalPages = computed(() =>
    this.articles.hasValue() ? Math.ceil(this.articles.value().total / TAG_PAGE_SIZE) : 0,
  );
  protected readonly errorMessages = computed(() =>
    this.articles.error() ? getApiErrorMessages(this.articles.error()) : [],
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
