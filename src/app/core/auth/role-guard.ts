import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../api/common.models';
import { AUTH_CONFIG } from '../tokens/auth-config';
import { AuthService } from './auth-service';

/** Allows logged-in users with one of the given roles. UI-level check; the server enforces access. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const config = inject(AUTH_CONFIG);

    await auth.loadCurrentUser();
    const user = auth.currentUser();
    if (!user) {
      return router.createUrlTree([config.loginUrl], { queryParams: { returnUrl: state.url } });
    }
    return roles.includes(user.role) ? true : router.parseUrl(config.homeUrl);
  };
}
