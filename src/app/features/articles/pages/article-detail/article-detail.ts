import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  RESPONSE_INIT,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Spinner } from '../../../../shared/ui/spinner/spinner';

/** Public article page: `/articles/:slug` (drafts → 404). */
@Component({
  selector: 'app-article-detail',
  imports: [RouterLink, TimeAgoPipe, Alert, Button, EmptyState, Spinner, ReadingListToggle],
  templateUrl: './article-detail.html',
  styleUrl: './article-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetail {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly seo = inject(Seo);
  /** Set only during server rendering. */
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly readingList = inject(ReadingListStore);

  readonly slug = input.required<string>();

  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly article = rxResource({
    params: () => this.slug(),
    stream: ({ params: slug }) => this.articlesApi.getBySlug(slug),
  });
  protected readonly isRead = computed(
    () => this.article.hasValue() && this.readingList.readIds().has(this.article.value().id),
  );

  /**
   * The API sanitizes article HTML (tag/attribute allowlist). Angular's own sanitizer would drop
   * `data-list`, which Quill 2 needs to tell bullet lists from ordered ones.
   */
  protected readonly content = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      this.article.hasValue() ? this.article.value().content : '',
    ),
  );
  protected readonly notFound = computed(() => {
    const error = this.article.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly errorMessages = computed(() =>
    this.article.error() && !this.notFound() ? getApiErrorMessages(this.article.error()) : [],
  );

  constructor() {
    effect(() => {
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
      } else if (this.notFound()) {
        this.seo.update({ title: 'სტატია ვერ მოიძებნა — Epoch' });
        if (this.responseInit) {
          this.responseInit.status = 404;
        }
      }
    });
  }
}
