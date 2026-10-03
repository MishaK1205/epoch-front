import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../users/users.models';
import { AuthResponse, LoginRequest, RegisterRequest } from './auth.models';

export const AUTH_LOGIN_URL = `${environment.apiUrl}/auth/login`;
export const AUTH_REGISTER_URL = `${environment.apiUrl}/auth/register`;

/** Raw `/auth` endpoints. Use `AuthService` to also keep the auth state in sync. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Public. */
  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_REGISTER_URL, body);
  }

  /** Public. */
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_LOGIN_URL, body);
  }

  /** Any logged-in user. */
  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }
}
