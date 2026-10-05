import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { toHttpParams } from '../http-params';
import {
  Article,
  ArticleSummary,
  CreateArticleRequest,
  ListArticlesQuery,
  ManageArticlesQuery,
  SearchArticlesQuery,
  UpdateArticleRequest,
} from './articles.models';

/**
 * Slugs change with the title until the first publish; always use the `slug` from the latest
 * response.
 */
@Injectable({ providedIn: 'root' })
export class ArticlesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/articles`;

  /** Public. Published articles only, newest `publishedAt` first. */
  listPublished(query: ListArticlesQuery = {}): Observable<Paginated<ArticleSummary>> {
    return this.http.get<Paginated<ArticleSummary>>(this.baseUrl, { params: toHttpParams(query) });
  }

  /** Public. Partial, case-insensitive match on title and tags. Published only, newest first. */
  search(query: SearchArticlesQuery): Observable<Paginated<ArticleSummary>> {
    return this.http.get<Paginated<ArticleSummary>>(`${this.baseUrl}/search`, {
      params: toHttpParams(query),
    });
  }

  /** Public. Drafts return 404. */
  getBySlug(slug: string): Observable<Article> {
    return this.http.get<Article>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  /** Moderator or admin; moderators only see their own. Newest `updatedAt` first. */
  listManaged(query: ManageArticlesQuery = {}): Observable<Paginated<ArticleSummary>> {
    return this.http.get<Paginated<ArticleSummary>>(`${this.baseUrl}/manage`, {
      params: toHttpParams(query),
    });
  }

  /** Owner (moderator) or admin. Loads drafts too — use this for the editor. */
  getManaged(id: string): Observable<Article> {
    return this.http.get<Article>(`${this.baseUrl}/manage/${encodeURIComponent(id)}`);
  }

  /** Moderator or admin. Always created as `draft`. */
  create(body: CreateArticleRequest): Observable<Article> {
    return this.http.post<Article>(this.baseUrl, body);
  }

  /** Owner (moderator) or admin. Send only the fields that changed. */
  update(id: string, body: UpdateArticleRequest): Observable<Article> {
    return this.http.patch<Article>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** Owner (moderator) or admin. Does not delete the images. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Owner (moderator) or admin. Sets `publishedAt` only on the first publish. */
  publish(id: string): Observable<Article> {
    return this.http.post<Article>(`${this.baseUrl}/${encodeURIComponent(id)}/publish`, null);
  }

  /** Owner (moderator) or admin. Back to `draft`; `publishedAt` is kept. */
  unpublish(id: string): Observable<Article> {
    return this.http.post<Article>(`${this.baseUrl}/${encodeURIComponent(id)}/unpublish`, null);
  }
}
