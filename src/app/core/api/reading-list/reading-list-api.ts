import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { toHttpParams } from '../http-params';
import { ReadingListItem, ReadingListQuery } from './reading-list.models';

/**
 * The current user's personal "saved" (read later) and "read" article lists.
 * All endpoints need an admin; the lists belong to the admin in the token.
 * `articleId` is the article **id**, not the slug.
 */
@Injectable({ providedIn: 'root' })
export class ReadingListApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me`;

  /** Admin only. Newest saved first. */
  listSaved(query: ReadingListQuery = {}): Observable<Paginated<ReadingListItem>> {
    return this.http.get<Paginated<ReadingListItem>>(`${this.baseUrl}/saved-articles`, {
      params: toHttpParams(query),
    });
  }

  /** Admin only. Idempotent; 404 if the article doesn't exist or isn't published. */
  save(articleId: string): Observable<void> {
    return this.http.put<void>(this.savedUrl(articleId), null);
  }

  /** Admin only. Idempotent (204 even if it wasn't saved). */
  unsave(articleId: string): Observable<void> {
    return this.http.delete<void>(this.savedUrl(articleId));
  }

  /** Admin only. Most recently marked first. */
  listRead(query: ReadingListQuery = {}): Observable<Paginated<ReadingListItem>> {
    return this.http.get<Paginated<ReadingListItem>>(`${this.baseUrl}/read-articles`, {
      params: toHttpParams(query),
    });
  }

  /** Admin only. Idempotent; 404 if the article doesn't exist or isn't published. */
  markRead(articleId: string): Observable<void> {
    return this.http.put<void>(this.readUrl(articleId), null);
  }

  /** Admin only. Idempotent (204 even if it wasn't marked). */
  markUnread(articleId: string): Observable<void> {
    return this.http.delete<void>(this.readUrl(articleId));
  }

  private savedUrl(articleId: string): string {
    return `${this.baseUrl}/saved-articles/${encodeURIComponent(articleId)}`;
  }

  private readUrl(articleId: string): string {
    return `${this.baseUrl}/read-articles/${encodeURIComponent(articleId)}`;
  }
}
