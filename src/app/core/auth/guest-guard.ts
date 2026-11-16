import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_CONFIG } from '../tokens/auth-config';
import { AuthService } from './auth-service';

/** Allows logged-out users only (the login page). An admin is sent home. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const config = inject(AUTH_CONFIG);

  await auth.loadCurrentUser();
  return auth.isLoggedIn() ? router.parseUrl(config.homeUrl) : true;
};
