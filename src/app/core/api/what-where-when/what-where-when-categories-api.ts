import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateWhatWhereWhenCategoryRequest,
  UpdateWhatWhereWhenCategoryRequest,
  WhatWhereWhenCategory,
} from './what-where-when.models';

/**
 * Categories of "What? Where? When?" packages (admin-only). Separate from the article
 * `CategoriesApi`: own endpoint, flat list, no slugs.
 */
@Injectable({ providedIn: 'root' })
export class WhatWhereWhenCategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/what-where-when-categories`;

  /** Plain array (not paginated), sorted by name. */
  list(): Observable<WhatWhereWhenCategory[]> {
    return this.http.get<WhatWhereWhenCategory[]>(this.baseUrl);
  }

  get(id: string): Observable<WhatWhereWhenCategory> {
    return this.http.get<WhatWhereWhenCategory>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  create(body: CreateWhatWhereWhenCategoryRequest): Observable<WhatWhereWhenCategory> {
    return this.http.post<WhatWhereWhenCategory>(this.baseUrl, body);
  }

  update(id: string, body: UpdateWhatWhereWhenCategoryRequest): Observable<WhatWhereWhenCategory> {
    return this.http.patch<WhatWhereWhenCategory>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      body,
    );
  }

  /** 409 while the category still has packages. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
