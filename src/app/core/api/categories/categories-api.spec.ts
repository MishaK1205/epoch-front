import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { CategoriesApi } from './categories-api';

describe('CategoriesApi', () => {
  const baseUrl = `${environment.apiUrl}/categories`;
  let api: CategoriesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CategoriesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('create sends parentId in the body for a subcategory', () => {
    api.create({ name: 'Medieval', parentId: 'abc' }).subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Medieval', parentId: 'abc' });
    req.flush({});
  });

  it('update sends a PATCH with only name / description', () => {
    api.update('507f1f77bcf86cd799439011', { name: 'History' }).subscribe();

    const req = http.expectOne(`${baseUrl}/507f1f77bcf86cd799439011`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'History' });
    req.flush({});
  });

  it('getBySlug encodes Georgian slugs', () => {
    api.getBySlug('შუა-საუკუნეები').subscribe();

    const req = http.expectOne(`${baseUrl}/${encodeURIComponent('შუა-საუკუნეები')}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
