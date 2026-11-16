import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { ApiGetCache } from './api-get-cache';

/**
 * Pages kept in memory after you leave them. Coming back shows the same screen and does not
 * ask the API again. A write drops the pages that show that data (see `ROUTES_BY_API`), and
 * logout drops all of them. Editors opt out with `canDeactivate` so a discarded draft is not
 * restored.
 */
const MAX_CACHED_ROUTES = 20;

/**
 * API path → route paths to forget when that API data changes.
 * `'/'` is only the home page; it must not match every route.
 */
const ROUTES_BY_API: Record<string, readonly string[]> = {
  '/articles': ['/', '/articles', '/category', '/search', '/me', '/manage/articles'],
  '/tags': ['/', '/search'],
  '/categories': [
    '/',
    '/articles',
    '/category',
    '/search',
    '/manage/categories',
    '/manage/articles',
  ],
  '/me/saved-articles': ['/me/saved'],
  '/me/read-articles': ['/me/read'],
  '/flashcards': ['/', '/flashcards', '/manage/flashcards'],
  '/flashcard-categories': ['/', '/flashcards', '/manage/flashcards'],
  '/what-where-when': ['/what-where-when', '/manage/what-where-when'],
  '/what-where-when-categories': ['/what-where-when', '/manage/what-where-when'],
  '/users': ['/manage/users'],
};

/** Full path + sorted query, so `/?tag=a` and `/` are different cached pages. */
export function routeStorageKey(route: ActivatedRouteSnapshot): string {
  const parts: string[] = [];
  for (const snapshot of route.pathFromRoot) {
    for (const segment of snapshot.url) {
      parts.push(segment.path);
    }
  }
  const path = `/${parts.join('/')}`;
  const params = new URLSearchParams();
  for (const name of [...route.queryParamMap.keys].sort()) {
    for (const value of route.queryParamMap.getAll(name)) {
      params.append(name, value);
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function routeShowsApiData(storageKey: string, apiPrefix: string): boolean {
  const path = storageKey.split('?')[0];
  const routes = ROUTES_BY_API[apiPrefix];
  if (!routes) {
    return false;
  }
  return routes.some((prefix) =>
    prefix === '/' ? path === '/' : path === prefix || path.startsWith(`${prefix}/`),
  );
}

@Injectable()
export class CachedRouteReuse implements RouteReuseStrategy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly handles = new Map<string, DetachedRouteHandle>();

  constructor() {
    inject(ApiGetCache).registerDroppedPrefixes((prefixes) => this.drop(prefixes));
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.canStore(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = routeStorageKey(route);
    if (!handle) {
      // The router clears the handle once the page is on screen again. Don't destroy it.
      this.handles.delete(key);
      return;
    }
    const previous = this.handles.get(key);
    if (previous && previous !== handle) {
      destroyHandle(previous);
    }
    this.handles.delete(key);
    this.handles.set(key, handle);
    while (this.handles.size > MAX_CACHED_ROUTES) {
      const oldest = this.handles.keys().next().value;
      if (oldest === undefined || oldest === key) {
        break;
      }
      destroyHandle(this.handles.get(oldest)!);
      this.handles.delete(oldest);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.handles.has(routeStorageKey(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.handles.get(routeStorageKey(route)) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  private canStore(route: ActivatedRouteSnapshot): boolean {
    if (!this.browser) {
      return false;
    }
    const config = route.routeConfig;
    if (!config || config.redirectTo !== undefined) {
      return false;
    }
    if (config.path === 'login' || config.path === '**') {
      return false;
    }
    if (config.canDeactivate && config.canDeactivate.length > 0) {
      return false;
    }
    if (config.children?.length || config.loadChildren) {
      return false;
    }
    return Boolean(config.component || config.loadComponent);
  }

  private drop(prefixes: readonly string[] | 'all'): void {
    for (const [key, handle] of this.handles) {
      if (prefixes === 'all' || prefixes.some((prefix) => routeShowsApiData(key, prefix))) {
        destroyHandle(handle);
        this.handles.delete(key);
      }
    }
  }
}

function destroyHandle(handle: DetachedRouteHandle): void {
  const stored = handle as { componentRef?: { destroy(): void } | null };
  stored.componentRef?.destroy();
}
