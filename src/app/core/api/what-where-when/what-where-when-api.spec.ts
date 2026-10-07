import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { WhatWhereWhenApi } from './what-where-when-api';
import { CreateWhatWhereWhenRequest } from './what-where-when.models';

describe('WhatWhereWhenApi', () => {
  const baseUrl = `${environment.apiUrl}/what-where-when`;
  const id = '6ac64e4e592927df3acc336b';
  let api: WhatWhereWhenApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WhatWhereWhenApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list sends GET /what-where-when without params by default', () => {
    api.list().subscribe();

    const req = http.expectOne((r) => r.url === baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('list sends the page param', () => {
    api.list({ page: 2 }).subscribe();

    const req = http.expectOne((r) => r.url === baseUrl);
    expect(req.request.params.keys()).toEqual(['page']);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 0, page: 2, limit: 20 });
  });

  it('list sends the categoryId filter', () => {
    api.list({ categoryId: 'abc' }).subscribe();

    const req = http.expectOne((r) => r.url === baseUrl);
    expect(req.request.params.get('categoryId')).toBe('abc');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('list omits an empty or missing categoryId', () => {
    api.list({ page: 1 }).subscribe();
    api.list({ page: 1, categoryId: '' }).subscribe();

    const requests = http.match((r) => r.url === baseUrl);
    expect(requests.map((req) => req.request.params.has('categoryId'))).toEqual([false, false]);
    requests.forEach((req) => req.flush({ items: [], total: 0, page: 1, limit: 20 }));
  });

  it('get sends GET /what-where-when/:id', () => {
    api.get('abc').subscribe();

    const req = http.expectOne(`${baseUrl}/abc`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create sends POST with the body', () => {
    const body: CreateWhatWhereWhenRequest = {
      name: 'Autumn cup',
      date: '2026-10-07',
      authors: ['Giorgi'],
      questions: [{ question: '<p>Q</p>', answer: 'A' }],
    };
    api.create(body).subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update sends PATCH with only the given fields', () => {
    api.update(id, { name: 'x' }).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'x' });
    req.flush({});
  });

  it('delete sends DELETE /what-where-when/:id', () => {
    api.delete(id).subscribe();

    const req = http.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
