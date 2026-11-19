import { HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, map, share, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** How many successful GET responses to keep for the logged-in session. */
const MAX_ENTRIES = 200;

interface Slot {
  response?: HttpResponse<unknown>;
  inflight?: Observable<HttpEvent<unknown>>;
}

/**
 * Which cached GETs a write should drop. `'all'` clears the session (login / an unknown write).
 * Longer prefixes are checked first so `/what-where-when-categories` is not treated as a package.
 */
export function mutationCachePrefixes(url: string): 'all' | readonly string[] {
  const path = apiPath(url);
  if (path === null) {
    return [];
  }
  if (path === '/auth/login') {
    return 'all';
  }
  if (path === '/auth/register' || path.startsWith('/users')) {
    return ['/users'];
  }
  if (path.startsWith('/articles')) {
    return ['/articles', '/tags', '/categories'];
  }
  if (path.startsWith('/categories')) {
    return ['/categories', '/articles'];
  }
  if (path.startsWith('/me/saved-articles')) {
    return ['/me/saved-articles'];
  }
  if (path.startsWith('/me/read-articles')) {
    return ['/me/read-articles'];
  }
  if (path.startsWith('/flashcard-categories')) {
    return ['/flashcard-categories', '/flashcards'];
  }
  if (path.startsWith('/flashcards')) {
    return ['/flashcards', '/flashcard-categories'];
  }
  if (path.startsWith('/quiz-categories')) {
    return ['/quiz-categories', '/quizzes'];
  }
  if (path.startsWith('/quizzes')) {
    return ['/quizzes', '/quiz-categories'];
  }
  if (path.startsWith('/what-where-when-categories')) {
    return ['/what-where-when-categories', '/what-where-when'];
  }
  if (path.startsWith('/what-where-when')) {
    return ['/what-where-when', '/what-where-when-categories'];
  }
  if (path.startsWith('/images')) {
    return ['/images'];
  }
  if (path.startsWith('/tags')) {
    return ['/tags'];
  }
  return 'all';
}

/** `GET https://api…/articles?limit=4`, with query keys sorted so the same query hits once. */
export function apiGetCacheKey(req: HttpRequest<unknown>): string {
  const raw = req.urlWithParams;
  try {
    const url = new URL(raw);
    url.searchParams.sort();
    const query = url.searchParams.toString();
    return `GET ${url.origin}${url.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return `GET ${raw}`;
  }
}

/**
 * Session cache of successful Epoch API GET responses.
 *
 * Pages ask for the same lists again every time they are created. This returns the previous
 * response instead, and shares one in-flight request between callers. A write (including a
 * failed one) drops the lists it can change. Logout and a new login drop everything.
 * The server builds a new app per request, so this never leaks from one visitor to another.
 */
@Injectable({ providedIn: 'root' })
export class ApiGetCache {
  private readonly slots = new Map<string, Slot>();
  private readonly generations = new Map<string, number>();
  /** Bumped on `clear()` so a response that arrives after logout is not stored. */
  private epoch = 0;
  private onDropped: ((prefixes: readonly string[] | 'all') => void) | null = null;

  /** `CachedRouteReuse` registers here so a write also discards the pages showing that data. */
  registerDroppedPrefixes(listener: (prefixes: readonly string[] | 'all') => void): void {
    this.onDropped = listener;
  }

  /**
   * Cached response, the in-flight request, or `source` — whichever applies.
   * Each subscriber gets its own copy of the JSON body.
   */
  connect(key: string, source: Observable<HttpEvent<unknown>>): Observable<HttpEvent<unknown>> {
    const cached = this.read(key);
    if (cached) {
      return cached;
    }
    const existing = this.slots.get(key);
    if (existing?.inflight) {
      return existing.inflight;
    }

    const epoch = this.epoch;
    const generation = this.generations.get(key) ?? 0;
    const shared = source.pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.remember(key, epoch, generation, event);
        }
      }),
      finalize(() => {
        const slot = this.slots.get(key);
        if (
          slot &&
          !slot.response &&
          this.epoch === epoch &&
          (this.generations.get(key) ?? 0) === generation
        ) {
          this.slots.delete(key);
        }
      }),
      share({ resetOnError: true, resetOnComplete: true, resetOnRefCountZero: true }),
    );
    const output = shared.pipe(
      map((event) =>
        event instanceof HttpResponse ? event.clone({ body: copyJson(event.body) }) : event,
      ),
    );
    this.slots.set(key, { inflight: output });
    this.evict();
    return output;
  }

  /** Drops every cached GET under this API path (`/articles` drops `/articles/search` too). */
  invalidatePrefix(prefix: string): void {
    const full = `${environment.apiUrl}${prefix}`;
    for (const key of this.slots.keys()) {
      if (cacheKeyMatches(key, full)) {
        this.bump(key);
      }
    }
    this.onDropped?.([prefix]);
  }

  /** Drops the GETs a write to `url` can make stale. */
  invalidateMutation(url: string): void {
    const prefixes = mutationCachePrefixes(url);
    if (prefixes === 'all') {
      this.clear();
      return;
    }
    for (const prefix of prefixes) {
      this.invalidatePrefix(prefix);
    }
  }

  /** Logout, or a new admin session. */
  clear(): void {
    this.epoch++;
    this.slots.clear();
    this.generations.clear();
    this.onDropped?.('all');
  }

  private read(key: string): Observable<HttpResponse<unknown>> | null {
    const slot = this.slots.get(key);
    if (!slot?.response) {
      return null;
    }
    this.slots.delete(key);
    this.slots.set(key, slot);
    return of(slot.response.clone({ body: copyJson(slot.response.body) }));
  }

  private remember(
    key: string,
    epoch: number,
    generation: number,
    event: HttpResponse<unknown>,
  ): void {
    if (this.epoch !== epoch || (this.generations.get(key) ?? 0) !== generation) {
      return;
    }
    const slot = this.slots.get(key) ?? {};
    slot.response = event.clone({ body: copyJson(event.body) });
    slot.inflight = undefined;
    this.slots.delete(key);
    this.slots.set(key, slot);
    this.evict();
  }

  private bump(key: string): void {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    this.slots.delete(key);
  }

  private evict(): void {
    while (this.slots.size > MAX_ENTRIES) {
      const oldest = this.slots.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this.slots.delete(oldest);
    }
  }
}

function apiPath(url: string): string | null {
  const bare = url.split('?')[0];
  if (bare === environment.apiUrl) {
    return '/';
  }
  if (!bare.startsWith(`${environment.apiUrl}/`)) {
    return null;
  }
  return bare.slice(environment.apiUrl.length);
}

function cacheKeyMatches(key: string, prefix: string): boolean {
  const url = key.slice('GET '.length).split('?')[0];
  return url === prefix || url.startsWith(`${prefix}/`);
}

function copyJson<T>(body: T): T {
  if (body === null || typeof body !== 'object') {
    return body;
  }
  return structuredClone(body);
}
