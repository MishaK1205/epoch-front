import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ReadingListApi } from './reading-list-api';

describe('ReadingListApi', () => {
  const baseUrl = `${environment.apiUrl}/me`;
  const id = '507f1f77bcf86cd799439011';
  let api: ReadingListApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReadingListApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listSaved sends GET /me/saved-articles with the given query', () => {
    api.listSaved({ page: 1, limit: 100 }).subscribe();

    const req = http.expectOne((r) => r.url === `${baseUrl}/saved-articles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ items: [], total: 0, page: 1, limit: 100 });
  });

  it('save sends PUT /me/saved-articles/:id with a null body', () => {
    api.save(id).subscribe();

    const req = http.expectOne(`${baseUrl}/saved-articles/${id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('unsave sends DELETE /me/saved-articles/:id', () => {
    api.unsave(id).subscribe();

    const req = http.expectOne(`${baseUrl}/saved-articles/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('listRead sends only the defined query params', () => {
    api.listRead({ page: 2 }).subscribe();

    const req = http.expectOne((r) => r.url === `${baseUrl}/read-articles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual(['page']);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 0, page: 2, limit: 20 });
  });

  it('markRead sends PUT /me/read-articles/:id with a null body', () => {
    api.markRead(id).subscribe();

    const req = http.expectOne(`${baseUrl}/read-articles/${id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('markUnread sends DELETE /me/read-articles/:id', () => {
    api.markUnread(id).subscribe();

    const req = http.expectOne(`${baseUrl}/read-articles/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
