import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams } from '../http-params';
import { ListTagsQuery, Tag } from './tags.models';

@Injectable({ providedIn: 'root' })
export class TagsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tags`;

  /** Public. Plain array, most used first; counts published articles only. */
  list(query: ListTagsQuery = {}): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.baseUrl, { params: toHttpParams(query) });
  }
}
