import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { FlashcardCategory } from '../../../../core/api/flashcards/flashcards.models';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

/** Newest article is the editor's pick; the next three are the latest stories. */
const HOME_SIZE = 4;
/** Tag feed (`?tag=`): paginated teaser grid. */
const TAG_PAGE_SIZE = 12;
const TOPIC_TINTS = 8;

function topicPaint(index: number): { tint: string; accent: string } {
  const slot = index % TOPIC_TINTS;
  return {
    tint: `var(--topic-tint-${slot})`,
    accent: `var(--topic-accent-${slot})`,
  };
}

/**
 * Front page: editorial hero, the real category tiles, three latest stories, and the
 * flashcard decks that already exist. `?tag=` keeps the paginated tag feed.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Alert,
    Pagination,
    Spinner,
    ArticleCard,
    ReadingListToggle,
    Icon,
    TimeAgoPipe,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly decksApi = inject(FlashcardCategoriesApi);
  private readonly router = inject(Router);

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

  protected readonly decks = rxResource({
    stream: () => this.decksApi.list(),
  });

  protected readonly heading = computed(() => {
    const tag = this.tag();
    return tag ? { kicker: 'თეგი', title: `#${tag}` } : null;
  });

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
  protected readonly featured = computed(() => (this.heading() ? null : (this.items()[0] ?? null)));
  protected readonly closer = computed(() => this.items().slice(1, HOME_SIZE));
  protected readonly deckCards = computed(() =>
    this.decks.hasValue() ? this.decks.value().slice(0, 3) : [],
  );
  protected readonly topicTiles = computed(() =>
    this.categories().map((category, index) => ({ category, ...topicPaint(index) })),
  );
  protected readonly studyDecks = computed(() =>
    this.deckCards().map((deck, index) => ({ deck, ...topicPaint(index) })),
  );
  protected readonly totalPages = computed(() =>
    this.articles.hasValue() ? Math.ceil(this.articles.value().total / TAG_PAGE_SIZE) : 0,
  );
  protected readonly errorMessages = computed(() =>
    this.articles.error() ? getApiErrorMessages(this.articles.error()) : [],
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }

  protected monogram(name: string): string {
    return Array.from(name.trim())[0] ?? '';
  }

  protected deckNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected deckProgress(deck: FlashcardCategory): number {
    if (deck.totalFlashcardCount <= 0) {
      return 0;
    }
    return Math.round((deck.totalKnownCount / deck.totalFlashcardCount) * 100);
  }
}
