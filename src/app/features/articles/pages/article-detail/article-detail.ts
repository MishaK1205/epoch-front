import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  RESPONSE_INIT,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { currentPageActive, navigationTick } from '../../../../core/services/active-page';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { readingMinutes, withSectionIds } from '../../../../shared/utils/article-sections';

/** Article page: `/articles/:slug` (drafts → 404). Admin only. */
@Component({
  selector: 'app-article-detail',
  imports: [
    RouterLink,
    TimeAgoPipe,
    Alert,
    Button,
    EmptyState,
    Spinner,
    ReadingListToggle,
    ArticleCard,
    Icon,
  ],
  templateUrl: './article-detail.html',
  styleUrl: './article-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
})
export class ArticleDetail {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly seo = inject(Seo);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly readingList = inject(ReadingListStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly navigation = navigationTick();
  private readonly pageActive = currentPageActive();
  private readonly root = viewChild<ElementRef<HTMLElement>>('articleRoot');

  readonly slug = input.required<string>();

  protected readonly copied = signal(false);
  protected readonly progress = signal(0);

  protected readonly article = rxResource({
    params: () => this.slug(),
    stream: ({ params: slug }) => this.articlesApi.getBySlug(slug),
  });

  protected readonly related = rxResource({
    params: () => {
      const article = this.article.hasValue() ? this.article.value() : null;
      const category = article?.category?.slug;
      return article && category ? { category, id: article.id } : undefined;
    },
    stream: ({ params }) => this.articlesApi.listPublished({ category: params.category, limit: 4 }),
  });

  protected readonly isRead = computed(
    () => this.article.hasValue() && this.readingList.readIds().has(this.article.value().id),
  );
  protected readonly readIds = this.readingList.readIds;

  protected readonly prepared = computed(() =>
    withSectionIds(this.article.hasValue() ? this.article.value().content : ''),
  );
  protected readonly sections = computed(() => this.prepared().sections);
  protected readonly minutes = computed(() =>
    readingMinutes(this.article.hasValue() ? this.article.value().content : ''),
  );
  /**
   * The API sanitizes article HTML. Angular's own sanitizer would drop `data-list`, which Quill 2
   * needs to tell bullet lists from ordered ones.
   */
  protected readonly content = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.prepared().html),
  );
  protected readonly relatedItems = computed(() => {
    if (!this.related.hasValue() || !this.article.hasValue()) {
      return [];
    }
    const id = this.article.value().id;
    return this.related
      .value()
      .items.filter((item) => item.id !== id)
      .slice(0, 3);
  });
  protected readonly notFound = computed(() => {
    const error = this.article.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly errorMessages = computed(() =>
    this.article.error() && !this.notFound() ? getApiErrorMessages(this.article.error()) : [],
  );
  protected readonly initial = computed(() => {
    const name = this.article.hasValue() ? (this.article.value().author?.username ?? '') : '';
    return Array.from(name)[0]?.toUpperCase() ?? 'ე';
  });

  constructor() {
    effect(() => {
      this.navigation();
      if (!this.pageActive()) {
        return;
      }
      if (this.article.hasValue()) {
        const article = this.article.value();
        this.seo.update({
          title: `${article.title} — Epoch`,
          description: article.excerpt,
          image: article.coverImage?.url,
          imageAlt: article.coverImage?.alt,
          article: {
            publishedAt: article.publishedAt,
            modifiedAt: article.updatedAt,
            author: article.author?.username ?? null,
            section: article.category?.name ?? null,
            tags: article.tags,
          },
        });
        this.progress.set(0);
      } else if (this.notFound()) {
        this.seo.update({ title: 'სტატია ვერ მოიძებნა — Epoch' });
        if (this.responseInit) {
          this.responseInit.status = 404;
        }
      }
    });
  }

  protected onScroll(): void {
    if (!this.pageActive()) {
      return;
    }
    const el = this.root()?.nativeElement;
    if (!el || !this.isBrowser) {
      return;
    }
    const total = el.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), Math.max(total, 0));
    this.progress.set(total <= 0 ? 0 : (scrolled / total) * 100);
  }

  protected async copyLink(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
