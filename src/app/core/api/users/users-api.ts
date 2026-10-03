import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { Role } from '../common.models';
import { toHttpParams } from '../http-params';
import { ListUsersQuery, UpdateRoleRequest, User } from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /** Admin only. Newest first. */
  list(query: ListUsersQuery = {}): Observable<Paginated<User>> {
    return this.http.get<Paginated<User>>(this.baseUrl, { params: toHttpParams(query) });
  }

  /** Admin only. Admins cannot change their own role (403). */
  updateRole(id: string, role: Role): Observable<User> {
    const body: UpdateRoleRequest = { role };
    return this.http.patch<User>(`${this.baseUrl}/${encodeURIComponent(id)}/role`, body);
  }
}
