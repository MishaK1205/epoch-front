import { HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked, WritableSignal } from '@angular/core';
import { EMPTY, expand, firstValueFrom, Observable, reduce, Subscription } from 'rxjs';
import { getApiErrorMessages } from '../api/api-error-messages';
import { ReadingListApi } from '../api/reading-list/reading-list-api';
import { ReadingListItem, ReadingListQuery } from '../api/reading-list/reading-list.models';
import { AuthService } from '../auth/auth-service';
import { Paginated } from '../../shared/models/paginated';

export const ARTICLE_UNAVAILABLE_MESSAGE = 'ეს სტატია აღარ არის ხელმისაწვდომი.';

/** Max `limit` the list endpoints accept. */
const PAGE_LIMIT = 100;

type ListIdsSignal = WritableSignal<ReadonlySet<string>>;

/**
 * Which article ids the current user has saved / marked as read, so cards and the article page
 * can show toggles (there is no "is this one article saved?" endpoint).
 *
 * Fills itself when a user is logged in (login, register, or session restore on app start) and
 * empties on logout. Toggles update optimistically and roll back if the request fails.
 */
@Injectable({ providedIn: 'root' })
export class ReadingListStore {
  private readonly api = inject(ReadingListApi);
  private readonly auth = inject(AuthService);

  private readonly _savedIds = signal<ReadonlySet<string>>(new Set());
  private readonly _readIds = signal<ReadonlySet<string>>(new Set());
  private readonly _loaded = signal(false);
  private readonly pendingSaved = new Set<string>();
  private readonly pendingRead = new Set<string>();
  private loading: Subscription | null = null;

  readonly savedIds = this._savedIds.asReadonly();
  readonly readIds = this._readIds.asReadonly();
  /** True once both lists were fetched for the current user. */
  readonly loaded = this._loaded.asReadonly();

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      untracked(() => (userId === null ? this.clear() : this.load()));
    });
  }

  isSaved(articleId: string): boolean {
    return this._savedIds().has(articleId);
  }

  isRead(articleId: string): boolean {
    return this._readIds().has(articleId);
  }

  /**
   * Saves or unsaves the article. Resolves with user-facing error messages (empty on success).
   * Ignored while a request for the same id is in flight.
   */
  toggleSaved(articleId: string): Promise<string[]> {
    return this.toggle(articleId, this._savedIds, this.pendingSaved, (add) =>
      add ? this.api.save(articleId) : this.api.unsave(articleId),
    );
  }

  /**
   * Marks the article as read or unread. Resolves with user-facing error messages (empty on
   * success). Ignored while a request for the same id is in flight.
   */
  toggleRead(articleId: string): Promise<string[]> {
    return this.toggle(articleId, this._readIds, this.pendingRead, (add) =>
      add ? this.api.markRead(articleId) : this.api.markUnread(articleId),
    );
  }

  /** Re-fetches both lists for the logged-in user. */
  reload(): void {
    if (this.auth.isLoggedIn()) {
      this.load();
    }
  }

  private load(): void {
    this.loading?.unsubscribe();
    this._loaded.set(false);
    let saved: ReadonlySet<string> | null = null;
    let read: ReadonlySet<string> | null = null;
    const finish = (): void => {
      if (saved !== null && read !== null) {
        this._savedIds.set(saved);
        this._readIds.set(read);
        this._loaded.set(true);
      }
    };
    // On failure the sets stay empty and `loaded` stays false; a 401 logs the user out anyway.
    this.loading = new Subscription();
    this.loading.add(
      this.fetchAllIds((query) => this.api.listSaved(query)).subscribe({
        next: (ids) => {
          saved = ids;
          finish();
        },
        error: () => undefined,
      }),
    );
    this.loading.add(
      this.fetchAllIds((query) => this.api.listRead(query)).subscribe({
        next: (ids) => {
          read = ids;
          finish();
        },
        error: () => undefined,
      }),
    );
  }

  private clear(): void {
    this.loading?.unsubscribe();
    this.loading = null;
    this.pendingSaved.clear();
    this.pendingRead.clear();
    this._savedIds.set(new Set());
    this._readIds.set(new Set());
    this._loaded.set(false);
  }

  /** Pages through a list endpoint until `total` items were seen and collects the article ids. */
  private fetchAllIds(
    list: (query: ReadingListQuery) => Observable<Paginated<ReadingListItem>>,
  ): Observable<ReadonlySet<string>> {
    return list({ page: 1, limit: PAGE_LIMIT }).pipe(
      expand((page) =>
        page.items.length > 0 && page.page * page.limit < page.total
          ? list({ page: page.page + 1, limit: PAGE_LIMIT })
          : EMPTY,
      ),
      reduce((ids, page) => {
        for (const item of page.items) {
          ids.add(item.article.id);
        }
        return ids;
      }, new Set<string>()),
    );
  }

  private async toggle(
    articleId: string,
    ids: ListIdsSignal,
    pending: Set<string>,
    request: (add: boolean) => Observable<void>,
  ): Promise<string[]> {
    if (pending.has(articleId)) {
      return [];
    }
    const add = !ids().has(articleId);
    pending.add(articleId);
    ids.update((set) => (add ? withId(set, articleId) : withoutId(set, articleId)));
    try {
      await firstValueFrom(request(add));
      return [];
    } catch (err: unknown) {
      // Roll back. For a 404 on add this also keeps the unavailable article out of the set.
      ids.update((set) => (add ? withoutId(set, articleId) : withId(set, articleId)));
      return toggleErrorMessages(err, add);
    } finally {
      pending.delete(articleId);
    }
  }
}

function withId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return new Set(set).add(id);
}

function withoutId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

function toggleErrorMessages(err: unknown, add: boolean): string[] {
  if (add && err instanceof HttpErrorResponse && err.status === 404) {
    return [ARTICLE_UNAVAILABLE_MESSAGE];
  }
  return getApiErrorMessages(err);
}
