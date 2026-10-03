import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_LOGIN_URL, AUTH_REGISTER_URL } from '../api/auth/auth-api';
import { AUTH_CONFIG } from '../tokens/auth-config';
import { AuthService } from './auth-service';

/**
 * Attaches the bearer token to Epoch API requests only, and logs the user out on 401
 * (except for login/register, where 401 means wrong credentials).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const config = inject(AUTH_CONFIG);
  const router = inject(Router);

  const token = auth.getToken();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isCredentialsRequest(req)) {
        auth.logout();
        if (config.redirectToLoginOn401) {
          void router.navigateByUrl(config.loginUrl);
        }
      }
      return throwError(() => err);
    }),
  );
};

function isApiRequest(req: HttpRequest<unknown>): boolean {
  return req.url === environment.apiUrl || req.url.startsWith(`${environment.apiUrl}/`);
}

function isCredentialsRequest(req: HttpRequest<unknown>): boolean {
  return req.method === 'POST' && (req.url === AUTH_LOGIN_URL || req.url === AUTH_REGISTER_URL);
}
