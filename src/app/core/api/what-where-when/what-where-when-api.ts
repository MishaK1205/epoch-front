import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { toHttpParams } from '../http-params';
import {
  CreateWhatWhereWhenRequest,
  ListWhatWhereWhenQuery,
  UpdateWhatWhereWhenRequest,
  WhatWhereWhenPackage,
  WhatWhereWhenSummary,
} from './what-where-when.models';

/** "What? Where? When?" quiz packages. Every endpoint is admin-only. */
@Injectable({ providedIn: 'root' })
export class WhatWhereWhenApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/what-where-when`;

  /** Newest `date` first (then newest created). */
  list(query: ListWhatWhereWhenQuery = {}): Observable<Paginated<WhatWhereWhenSummary>> {
    return this.http.get<Paginated<WhatWhereWhenSummary>>(this.baseUrl, {
      params: toHttpParams(query),
    });
  }

  get(id: string): Observable<WhatWhereWhenPackage> {
    return this.http.get<WhatWhereWhenPackage>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** The response has sanitized question HTML and trimmed text; use it as the new state. */
  create(body: CreateWhatWhereWhenRequest): Observable<WhatWhereWhenPackage> {
    return this.http.post<WhatWhereWhenPackage>(this.baseUrl, body);
  }

  /** `questions` replaces the whole list, so always send all of them. */
  update(id: string, body: UpdateWhatWhereWhenRequest): Observable<WhatWhereWhenPackage> {
    return this.http.patch<WhatWhereWhenPackage>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** Does not delete the images used in the questions. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
