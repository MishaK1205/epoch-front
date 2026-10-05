import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ArticleSummary } from '../api/articles/articles.models';
import { ReadingListItem } from '../api/reading-list/reading-list.models';
import { AuthService } from '../auth/auth-service';
import { ARTICLE_UNAVAILABLE_MESSAGE, ReadingListStore } from './reading-list-store';

const SAVED_URL = `${environment.apiUrl}/me/saved-articles`;
const READ_URL = `${environment.apiUrl}/me/read-articles`;

function item(id: string): ReadingListItem {
  const article: ArticleSummary = {
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    excerpt: '',
    coverImage: null,
    category: null,
    subcategory: null,
    tags: [],
    author: null,
    status: 'published',
    publishedAt: '2026-10-01T12:00:00.000Z',
    createdAt: '2026-09-30T09:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
  return { article, addedAt: '2026-10-04T08:15:00.000Z' };
}

describe('ReadingListStore', () => {
  let store: ReadingListStore;
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(ReadingListStore);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function logIn(): void {
    auth.login({ identifier: 'john', password: 'secret123' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'john',
        email: 'john@example.com',
        role: 'user',
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    });
    TestBed.tick();
  }

  function expectList(url: string, page: number): TestRequest {
    return http.expectOne(
      (r) =>
        r.url === url && r.params.get('page') === String(page) && r.params.get('limit') === '100',
    );
  }

  function flushLists(saved: string[] = [], read: string[] = []): void {
    expectList(SAVED_URL, 1).flush({
      items: saved.map(item),
      total: saved.length,
      page: 1,
      limit: 100,
    });
    expectList(READ_URL, 1).flush({
      items: read.map(item),
      total: read.length,
      page: 1,
      limit: 100,
    });
  }

  it('does nothing while logged out', () => {
    http.expectNone((r) => r.url.startsWith(`${environment.apiUrl}/me/`));
    expect(store.loaded()).toBe(false);
    expect(store.savedIds().size).toBe(0);
  });

  it('loads both lists after login and clears them on logout', () => {
    logIn();
    flushLists(['a1', 'a2'], ['a2']);

    expect(store.loaded()).toBe(true);
    expect(store.isSaved('a1')).toBe(true);
    expect(store.isSaved('a2')).toBe(true);
    expect(store.isRead('a2')).toBe(true);
    expect(store.isRead('a1')).toBe(false);

    auth.logout();
    TestBed.tick();

    expect(store.loaded()).toBe(false);
    expect(store.savedIds().size).toBe(0);
    expect(store.readIds().size).toBe(0);
  });

  it('pages through a list until total items were seen', () => {
    logIn();
    expectList(READ_URL, 1).flush({ items: [], total: 0, page: 1, limit: 100 });

    const firstPage = Array.from({ length: 100 }, (_, i) => `s${i}`);
    expectList(SAVED_URL, 1).flush({ items: firstPage.map(item), total: 101, page: 1, limit: 100 });
    expect(store.loaded()).toBe(false);

    expectList(SAVED_URL, 2).flush({ items: [item('s100')], total: 101, page: 2, limit: 100 });
    expect(store.loaded()).toBe(true);
    expect(store.savedIds().size).toBe(101);
    expect(store.isSaved('s100')).toBe(true);
  });

  it('toggleSaved adds optimistically and keeps it on success', async () => {
    logIn();
    flushLists();

    const result = store.toggleSaved('a1');
    expect(store.isSaved('a1')).toBe(true);

    const req = http.expectOne(`${SAVED_URL}/a1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(await result).toEqual([]);
    expect(store.isSaved('a1')).toBe(true);
  });

  it('toggleSaved rolls back when the request fails', async () => {
    logIn();
    flushLists(['a1']);

    const result = store.toggleSaved('a1');
    expect(store.isSaved('a1')).toBe(false);

    const req = http.expectOne(`${SAVED_URL}/a1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(
      { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(await result).toEqual(['Internal server error']);
    expect(store.isSaved('a1')).toBe(true);
  });

  it('toggleRead reports an unavailable article on 404 and keeps it out of the set', async () => {
    logIn();
    flushLists();

    const result = store.toggleRead('gone');
    expect(store.isRead('gone')).toBe(true);

    http
      .expectOne(`${READ_URL}/gone`)
      .flush(
        { statusCode: 404, message: 'Article not found', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(await result).toEqual([ARTICLE_UNAVAILABLE_MESSAGE]);
    expect(store.isRead('gone')).toBe(false);
  });

  it('ignores a second toggle for the same id while one is in flight', async () => {
    logIn();
    flushLists();

    const first = store.toggleSaved('a1');
    const second = store.toggleSaved('a1');
    expect(store.isSaved('a1')).toBe(true);

    http.expectOne(`${SAVED_URL}/a1`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectNone(`${SAVED_URL}/a1`);

    expect(await first).toEqual([]);
    expect(await second).toEqual([]);
    expect(store.isSaved('a1')).toBe(true);
  });
});
