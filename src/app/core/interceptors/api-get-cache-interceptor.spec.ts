import {
  HttpClient,
  HttpContext,
  HttpParams,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiGetCache, mutationCachePrefixes } from '../services/api-get-cache';
import { API_GET_CACHE, apiGetCacheInterceptor } from './api-get-cache-interceptor';

const articlesUrl = `${environment.apiUrl}/articles`;

describe('mutationCachePrefixes', () => {
  const api = environment.apiUrl;

  it('drops article lists, tags and category counts after an article write', () => {
    expect(mutationCachePrefixes(`${api}/articles/abc/publish`)).toEqual([
      '/articles',
      '/tags',
      '/categories',
    ]);
  });

  it('drops only the saved list after a bookmark', () => {
    expect(mutationCachePrefixes(`${api}/me/saved-articles/abc`)).toEqual(['/me/saved-articles']);
  });

  it('treats package categories separately from packages', () => {
    expect(mutationCachePrefixes(`${api}/what-where-when-categories/abc`)).toEqual([
      '/what-where-when-categories',
      '/what-where-when',
    ]);
  });

  it('clears the session on login', () => {
    expect(mutationCachePrefixes(`${api}/auth/login`)).toBe('all');
  });
});

describe('apiGetCacheInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiGetCacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    TestBed.inject(ApiGetCache).clear();
  });

  it('returns the same GET without a second request', () => {
    let first: { items: number[] } | undefined;
    http.get<{ items: number[] }>(articlesUrl).subscribe((body) => (first = body));
    controller.expectOne(articlesUrl).flush({ items: [1] });

    first!.items.push(9);

    let second: { items: number[] } | undefined;
    http.get<{ items: number[] }>(articlesUrl).subscribe((body) => (second = body));
    expect(second).toEqual({ items: [1] });
    expect(first).toEqual({ items: [1, 9] });
  });

  it('shares one request between callers still waiting', () => {
    const seen: number[] = [];
    http.get<{ n: number }>(articlesUrl).subscribe((body) => seen.push(body.n));
    http.get<{ n: number }>(articlesUrl).subscribe((body) => seen.push(body.n));

    controller.expectOne(articlesUrl).flush({ n: 4 });
    expect(seen).toEqual([4, 4]);
  });

  it('matches a query regardless of parameter order', () => {
    const first = new HttpParams().set('b', '2').set('a', '1');
    const second = new HttpParams().set('a', '1').set('b', '2');
    http.get(articlesUrl, { params: first }).subscribe();
    controller.expectOne(`${articlesUrl}?b=2&a=1`).flush({ ok: true });

    let cached = false;
    http.get(articlesUrl, { params: second }).subscribe(() => (cached = true));
    expect(cached).toBe(true);
  });

  it('asks again after a write, including a failed one', () => {
    http.get(articlesUrl).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });

    http.post(articlesUrl, { title: 'x' }).subscribe({ error: () => undefined });
    controller.expectOne(articlesUrl).flush('no', { status: 400, statusText: 'Bad Request' });

    http.get(articlesUrl).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });
  });

  it('keeps article lists when a bookmark changes', () => {
    http.get(articlesUrl).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });

    http.put(`${environment.apiUrl}/me/saved-articles/abc`, null).subscribe();
    controller.expectOne(`${environment.apiUrl}/me/saved-articles/abc`).flush(null);

    let cached = false;
    http.get(articlesUrl).subscribe(() => (cached = true));
    expect(cached).toBe(true);
  });

  it('does not store a failed GET', () => {
    http.get(articlesUrl).subscribe({ error: () => undefined });
    controller.expectOne(articlesUrl).flush('missing', { status: 404, statusText: 'Not Found' });

    http.get(articlesUrl).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });
  });

  it('does not store /auth/me or a request that opts out', () => {
    const me = `${environment.apiUrl}/auth/me`;
    http.get(me).subscribe();
    controller.expectOne(me).flush({ id: '1' });
    http.get(me).subscribe();
    controller.expectOne(me).flush({ id: '1' });

    const context = new HttpContext().set(API_GET_CACHE, false);
    http.get(articlesUrl, { context }).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });
    http.get(articlesUrl, { context }).subscribe();
    controller.expectOne(articlesUrl).flush({ items: [] });
  });

  it('ignores a response that arrives after the cache was cleared', () => {
    let first: { n: number } | undefined;
    http.get<{ n: number }>(articlesUrl).subscribe((body) => (first = body));
    const request = controller.expectOne(articlesUrl);
    TestBed.inject(ApiGetCache).clear();
    request.flush({ n: 1 });
    expect(first).toEqual({ n: 1 });

    http.get(articlesUrl).subscribe();
    controller.expectOne(articlesUrl).flush({ n: 2 });
  });
});
