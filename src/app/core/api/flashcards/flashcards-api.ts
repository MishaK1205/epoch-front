import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { API_LIMITS } from '../api-limits';
import { toHttpParams } from '../http-params';
import {
  CreateFlashcardRequest,
  Flashcard,
  FlashcardKnowledgeState,
  FlashcardProgress,
  ListFlashcardsQuery,
  ResetFlashcardsRequest,
  ResetFlashcardsResult,
  UpdateFlashcardRequest,
} from './flashcards.models';

/** `direct` is sent only when it is `true` (false / omitted must not appear in the query). */
function listParams(query: ListFlashcardsQuery): ListFlashcardsQuery {
  if (query.direct === true) {
    return query;
  }
  const { direct: _direct, ...rest } = query;
  return rest;
}

/** Admin flashcards. Every endpoint requires the admin role. */
@Injectable({ providedIn: 'root' })
export class FlashcardsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/flashcards`;

  /** Ordered by `position`, then `createdAt`, then `id`. */
  list(query: ListFlashcardsQuery = {}): Observable<Paginated<Flashcard>> {
    return this.http.get<Paginated<Flashcard>>(this.baseUrl, {
      params: toHttpParams(listParams(query)),
    });
  }

  /**
   * Every card matching `query`, in study order. The API returns at most 100 per
   * request, so this follows `page` until `total` is covered.
   */
  listAll(query: ListFlashcardsQuery = {}): Observable<Flashcard[]> {
    const { page: _page, limit: _limit, ...filters } = query;
    const limit = API_LIMITS.pagination.maxLimit;
    const load = (page: number) => this.list({ ...filters, page, limit });
    return load(1).pipe(
      expand((result) => {
        const loaded = result.page * result.limit;
        if (result.items.length === 0 || loaded >= result.total) {
          return EMPTY;
        }
        return load(result.page + 1);
      }),
      map((result) => result.items),
      reduce((cards, items) => cards.concat(items), [] as Flashcard[]),
    );
  }

  /**
   * `GET /flashcards/progress` — not `GET /flashcards/:id`. `page`, `limit` and `status`
   * are list-only and are never sent.
   */
  progress(query: ListFlashcardsQuery = {}): Observable<FlashcardProgress> {
    const { page: _page, limit: _limit, status: _status, ...rest } = query;
    return this.http.get<FlashcardProgress>(`${this.baseUrl}/progress`, {
      params: toHttpParams(listParams(rest)),
    });
  }

  get(id: string): Observable<Flashcard> {
    return this.http.get<Flashcard>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** The server assigns `position` (appended). Don't send it. */
  create(body: CreateFlashcardRequest): Observable<Flashcard> {
    return this.http.post<Flashcard>(this.baseUrl, body);
  }

  update(id: string, body: UpdateFlashcardRequest): Observable<Flashcard> {
    return this.http.patch<Flashcard>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** 204. Also clears every admin's known mark for the card. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Idempotent. The first `knownAt` stays. Returns JSON, not 204. */
  markKnown(id: string): Observable<FlashcardKnowledgeState> {
    return this.http.put<FlashcardKnowledgeState>(
      `${this.baseUrl}/${encodeURIComponent(id)}/known`,
      null,
    );
  }

  /** Idempotent. Returns `{ known: false, knownAt: null }`, not 204. */
  markUnknown(id: string): Observable<FlashcardKnowledgeState> {
    return this.http.delete<FlashcardKnowledgeState>(
      `${this.baseUrl}/${encodeURIComponent(id)}/known`,
    );
  }

  /** Send `{}` to reset every card of the current admin. Does not delete cards. */
  reset(body: ResetFlashcardsRequest = {}): Observable<ResetFlashcardsResult> {
    return this.http.post<ResetFlashcardsResult>(`${this.baseUrl}/reset`, body);
  }
}
