import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FlashcardCategoriesApi } from './flashcard-categories-api';

describe('FlashcardCategoriesApi', () => {
  const baseUrl = `${environment.apiUrl}/flashcard-categories`;
  const id = '674f1c2e8b3f4a0012345678';
  let api: FlashcardCategoriesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FlashcardCategoriesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list sends GET /flashcard-categories', () => {
    api.list().subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('getBySlug encodes the slug', () => {
    const slug = 'შუა საუკუნეები';
    api.getBySlug(slug).subscribe();

    const req = http.expectOne(`${baseUrl}/${encodeURIComponent(slug)}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe(`${baseUrl}/${encodeURIComponent(slug)}`);
    req.flush({});
  });

  it('create sends POST with the body, including parentId', () => {
    api.create({ name: 'History', parentId: 'abc' }).subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'History', parentId: 'abc' });
    req.flush({});
  });

  it('update sends PATCH with only the given fields and no parentId', () => {
    api.update(id, { name: 'Art' }).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Art' });
    expect(req.request.body).not.toHaveProperty('parentId');
    req.flush({});
  });

  it('delete sends DELETE /flashcard-categories/:id', () => {
    api.delete(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
