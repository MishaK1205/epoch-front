import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ArticlesApi } from './articles-api';

describe('ArticlesApi', () => {
  const baseUrl = `${environment.apiUrl}/articles`;
  let api: ArticlesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ArticlesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listPublished sends only defined filters', () => {
    api.listPublished({ page: 2, category: 'history', tag: '', q: undefined }).subscribe();

    const req = http.expectOne((r) => r.url === baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['category', 'page']);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('category')).toBe('history');
    req.flush({ items: [], total: 0, page: 2, limit: 20 });
  });

  it('getBySlug encodes non-Latin slugs', () => {
    api.getBySlug('ისტორია-abc').subscribe();

    const req = http.expectOne(`${baseUrl}/${encodeURIComponent('ისტორია-abc')}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('listManaged calls /articles/manage with status', () => {
    api.listManaged({ status: 'draft' }).subscribe();

    const req = http.expectOne((r) => r.url === `${baseUrl}/manage`);
    expect(req.request.params.get('status')).toBe('draft');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('update sends a PATCH with only the given fields', () => {
    api.update('507f1f77bcf86cd799439011', { title: 'New title' }).subscribe();

    const req = http.expectOne(`${baseUrl}/507f1f77bcf86cd799439011`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'New title' });
    req.flush({});
  });

  it('publish sends a POST without a body', () => {
    api.publish('507f1f77bcf86cd799439011').subscribe();

    const req = http.expectOne(`${baseUrl}/507f1f77bcf86cd799439011/publish`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('delete sends a DELETE', () => {
    api.delete('507f1f77bcf86cd799439011').subscribe();

    const req = http.expectOne(`${baseUrl}/507f1f77bcf86cd799439011`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
