import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from './categories.models';

@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  /**
   * Public. Plain array (not paginated), sorted by name. Only TOP-LEVEL categories, each with
   * its subcategories nested in `subcategories` — search with `findCategoryById` /
   * `findCategoryBySlug`, not on this array directly.
   */
  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.baseUrl);
  }

  /** Public. Categories and subcategories (for a subcategory `parent` is set). */
  getBySlug(slug: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  /** Admin only. `parentId` (a top-level category) creates a subcategory of it. */
  create(body: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, body);
  }

  /**
   * Admin only. Name / description only; the parent can't change. Renaming changes the slug —
   * use the returned `slug`.
   */
  update(id: string, body: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /**
   * Admin only. 409 while the category still has subcategories or is used by articles (drafts
   * included).
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
