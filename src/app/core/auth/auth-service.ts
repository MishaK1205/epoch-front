import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { AuthApi } from '../api/auth/auth-api';
import { AuthResponse, LoginRequest, RegisterRequest } from '../api/auth/auth.models';
import { User } from '../api/users/users.models';

/** Shown when a correct password belongs to a role that cannot call the API. */
export const NO_ACCESS_MESSAGE = 'ამ ანგარიშს წვდომა არ აქვს';

const TOKEN_KEY = 'epoch_access_token';
const TOKEN_EXPIRES_AT_KEY = 'epoch_access_token_expires_at';
/** setTimeout overflows above this delay. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** Owns the auth state: token storage, current user and role helpers. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  /** `null` during server rendering: the server always renders the guest view. */
  private readonly storage = isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage : null;

  private readonly _currentUser = signal<User | null>(null);
  private initialization: Promise<void> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  /** The only role that can use the app. `user` and `moderator` stay in the API union. */
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  /**
   * Admin only. Creates an account with role `user`. Does not store `accessToken` or replace
   * `currentUser` — the new account cannot call the API until its role is changed to `admin`.
   */
  createAccount(body: RegisterRequest): Observable<AuthResponse> {
    return this.authApi.register(body);
  }

  /**
   * Public. Stores the token and sets `currentUser` only when the account is an admin.
   * A correct password for `user` or `moderator` still returns 200; that token is discarded.
   */
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.authApi.login(body).pipe(
      tap((response) => {
        if (response.user.role === 'admin') {
          this.startSession(response);
        }
      }),
    );
  }

  /** Admin only. Refreshes `currentUser` (e.g. to pick up a role change). */
  me(): Observable<User> {
    return this.authApi.me().pipe(tap((user) => this._currentUser.set(user)));
  }

  /** Client-only: there is no logout endpoint. */
  logout(): void {
    this.storage?.removeItem(TOKEN_KEY);
    this.storage?.removeItem(TOKEN_EXPIRES_AT_KEY);
    this.clearExpiryTimer();
    this._currentUser.set(null);
  }

  /** Returns the stored token, or `null` if missing or expired. */
  getToken(): string | null {
    const token = this.storage?.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }
    const expiresAt = this.getExpiresAt();
    if (expiresAt !== null && expiresAt <= Date.now()) {
      this.logout();
      return null;
    }
    return token;
  }

  /**
   * Restores the session on app start. Runs once; later calls return the same promise, so
   * guards can await it. Never rejects.
   */
  loadCurrentUser(): Promise<void> {
    this.initialization ??= this.restoreSession();
    return this.initialization;
  }

  private async restoreSession(): Promise<void> {
    if (!this.getToken()) {
      return;
    }
    const expiresAt = this.getExpiresAt();
    if (expiresAt !== null) {
      this.scheduleExpiry(expiresAt);
    }
    try {
      const user = await firstValueFrom(this.me());
      if (user.role !== 'admin') {
        this.logout();
      }
    } catch (err) {
      // 403 here means the stored account is not an admin. Other 403s (for example
      // "You cannot change your own role") are not handled in this method.
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.logout();
      }
    }
  }

  private startSession(response: AuthResponse): void {
    const expiresAt = Date.now() + response.expiresIn * 1000;
    this.storage?.setItem(TOKEN_KEY, response.accessToken);
    this.storage?.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    this.scheduleExpiry(expiresAt);
    this._currentUser.set(response.user);
  }

  private getExpiresAt(): number | null {
    const value = Number(this.storage?.getItem(TOKEN_EXPIRES_AT_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearExpiryTimer();
    const delay = expiresAt - Date.now();
    if (delay <= MAX_TIMER_DELAY_MS) {
      this.expiryTimer = setTimeout(() => this.logout(), Math.max(delay, 0));
    }
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
