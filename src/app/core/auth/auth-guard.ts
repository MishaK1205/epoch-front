import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_CONFIG } from '../tokens/auth-config';
import { AuthService } from './auth-service';

/**
 * Allows any signed-in user. Routes use `roleGuard('admin')` instead: a `user` or `moderator`
 * session is not enough to open the app.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const config = inject(AUTH_CONFIG);

  await auth.loadCurrentUser();
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree([config.loginUrl], { queryParams: { returnUrl: state.url } });
};
