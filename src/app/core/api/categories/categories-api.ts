import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from './categories.models';

@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  /** Public. Plain array (not paginated), sorted by name. */
  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.baseUrl);
  }

  /** Public. */
  getBySlug(slug: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  /** Admin only. */
  create(body: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, body);
  }

  /** Admin only. Renaming changes the slug — use the returned `slug`. */
  update(id: string, body: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** Admin only. 409 while the category is still used by articles. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
