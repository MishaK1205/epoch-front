import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Role } from '../api/common.models';
import { AUTH_CONFIG } from '../tokens/auth-config';
import { AuthService } from './auth-service';

/**
 * Matches only an admin session. A `user` or `moderator` session is cleared so the next route
 * (the redirect to `/login`) does not bounce them back here.
 */
export const adminMatch: CanMatchFn = async () => {
  const auth = inject(AuthService);
  await auth.loadCurrentUser();
  const allowed = auth.isAdmin();
  if (!allowed && auth.isLoggedIn()) {
    auth.logout();
  }
  return allowed;
};

/**
 * Allows a signed-in user with one of the given roles. Anyone else is sent to the login page.
 * A stored session whose role is not allowed is cleared, so a non-admin token cannot linger.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const config = inject(AUTH_CONFIG);

    await auth.loadCurrentUser();
    const user = auth.currentUser();
    if (user && roles.includes(user.role)) {
      return true;
    }
    if (user) {
      auth.logout();
    }
    return router.createUrlTree([config.loginUrl], { queryParams: { returnUrl: state.url } });
  };
}
