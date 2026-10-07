import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { WhatWhereWhenCategoriesApi } from './what-where-when-categories-api';

describe('WhatWhereWhenCategoriesApi', () => {
  const baseUrl = `${environment.apiUrl}/what-where-when-categories`;
  const id = '6ac654618280bf721188b701';
  let api: WhatWhereWhenCategoriesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WhatWhereWhenCategoriesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list sends GET /what-where-when-categories', () => {
    api.list().subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('get sends GET /what-where-when-categories/:id', () => {
    api.get(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create sends POST with the body', () => {
    api.create({ name: 'x' }).subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'x' });
    req.flush({});
  });

  it('update sends PATCH with only the given fields', () => {
    api.update(id, { description: '' }).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ description: '' });
    req.flush({});
  });

  it('delete sends DELETE /what-where-when-categories/:id', () => {
    api.delete(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
