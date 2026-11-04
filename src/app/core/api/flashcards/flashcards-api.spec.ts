import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FlashcardsApi } from './flashcards-api';

describe('FlashcardsApi', () => {
  const baseUrl = `${environment.apiUrl}/flashcards`;
  const id = '674f1c2e8b3f4a0012345680';
  let api: FlashcardsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FlashcardsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectList(): ReturnType<HttpTestingController['expectOne']> {
    return http.expectOne((req) => req.url === baseUrl);
  }

  it('list sends categoryId, direct, status and page', () => {
    api.list({ categoryId: 'abc', direct: true, status: 'unknown', page: 1 }).subscribe();

    const req = expectList();
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('categoryId')).toBe('abc');
    expect(req.request.params.get('direct')).toBe('true');
    expect(req.request.params.get('status')).toBe('unknown');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('list({}) does not send direct, status or categoryId', () => {
    api.list({}).subscribe();

    const req = expectList();
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.params.has('direct')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('categoryId')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('list omits direct unless it is true', () => {
    api.list({ categoryId: 'abc', direct: false }).subscribe();

    const req = expectList();
    expect(req.request.params.get('categoryId')).toBe('abc');
    expect(req.request.params.has('direct')).toBe(false);
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('progress calls /flashcards/progress and drops status and page', () => {
    api.progress({ categoryId: 'abc', status: 'unknown', page: 2 }).subscribe();

    const req = http.expectOne((candidate) => candidate.url === `${baseUrl}/progress`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('categoryId')).toBe('abc');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('page')).toBe(false);
    expect(req.request.params.has('limit')).toBe(false);
    req.flush({ total: 0, known: 0, unknown: 0 });
  });

  it('progress keeps direct=true and still drops status', () => {
    api.progress({ categoryId: 'abc', direct: true, status: 'known', limit: 20 }).subscribe();

    const req = http.expectOne((candidate) => candidate.url === `${baseUrl}/progress`);
    expect(req.request.params.get('categoryId')).toBe('abc');
    expect(req.request.params.get('direct')).toBe('true');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('limit')).toBe(false);
    req.flush({ total: 1, known: 0, unknown: 1 });
  });

  it('markKnown sends PUT /flashcards/:id/known with no body', () => {
    api.markKnown(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}/known`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush({ known: true, knownAt: '2026-11-04T12:00:00.000Z' });
  });

  it('markUnknown sends DELETE /flashcards/:id/known', () => {
    api.markUnknown(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}/known`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ known: false, knownAt: null });
  });

  it('reset({}) sends POST /flashcards/reset with {}', () => {
    api.reset().subscribe();

    const req = http.expectOne(`${baseUrl}/reset`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ reset: 0 });
  });

  it('reset({ subcategoryId }) sends exactly that body', () => {
    api.reset({ subcategoryId: 'sub' }).subscribe();

    const req = http.expectOne(`${baseUrl}/reset`);
    expect(req.request.body).toEqual({ subcategoryId: 'sub' });
    req.flush({ reset: 2 });
  });

  it('delete sends DELETE /flashcards/:id', () => {
    api.delete(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
