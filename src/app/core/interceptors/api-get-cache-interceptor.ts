import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiGetCache, apiGetCacheKey } from '../services/api-get-cache';

/** Set to `false` on a GET that must always hit the network and must not be stored. */
export const API_GET_CACHE = new HttpContextToken<boolean>(() => true);

/**
 * Serves a repeated Epoch API GET from `ApiGetCache`. A write drops the lists it can change,
 * so the `.reload()` that follows the write still reaches the server.
 * Runs after `authInterceptor` (the cache key is the URL, not the token).
 */
export const apiGetCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isEpochApiRequest(req)) {
    return next(req);
  }

  const cache = inject(ApiGetCache);
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.invalidateMutation(req.url);
        }
      }),
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
          cache.invalidateMutation(req.url);
        }
        return throwError(() => err);
      }),
    );
  }

  if (!canCacheGet(req)) {
    return next(req);
  }
  return cache.connect(apiGetCacheKey(req), next(req));
};

function canCacheGet(req: Parameters<HttpInterceptorFn>[0]): boolean {
  if (req.responseType !== 'json' || req.reportProgress || !req.context.get(API_GET_CACHE)) {
    return false;
  }
  const path = req.url.split('?')[0];
  return !path.endsWith('/auth/me');
}

function isEpochApiRequest(req: Parameters<HttpInterceptorFn>[0]): boolean {
  return req.url === environment.apiUrl || req.url.startsWith(`${environment.apiUrl}/`);
}
