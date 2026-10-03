import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
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
  private readonly title = inject(Title);
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
        this.title.setTitle(`${this.article.value().title} — Epoch`);
      } else if (this.notFound()) {
        this.title.setTitle('სტატია ვერ მოიძებნა — Epoch');
      }
    });
  }
}
