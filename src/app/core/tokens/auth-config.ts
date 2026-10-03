import { InjectionToken } from '@angular/core';

export interface AuthConfig {
  /** Where guards send users who are not logged in. */
  loginUrl: string;
  /** Where guards send users who are logged in but not allowed, or already logged in (guest-only routes). */
  homeUrl: string;
  /** If true, the auth interceptor navigates to `loginUrl` after a 401 logs the user out. */
  redirectToLoginOn401: boolean;
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => ({ loginUrl: '/login', homeUrl: '/', redirectToLoginOn401: false }),
});
