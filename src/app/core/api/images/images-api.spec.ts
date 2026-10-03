import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ClientValidationError } from '../client-validation-error';
import { ImagesApi } from './images-api';

describe('ImagesApi', () => {
  const baseUrl = `${environment.apiUrl}/images`;
  let api: ImagesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ImagesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('upload sends multipart form data with file and alt', () => {
    const file = new File(['png'], 'photo.png', { type: 'image/png' });
    api.upload(file, 'A photo').subscribe();

    const req = http.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    const body = req.request.body as FormData;
    expect(body.get('file')).toBeInstanceOf(File);
    expect(body.get('alt')).toBe('A photo');
    req.flush({});
  });

  it('upload omits alt when not given', () => {
    api.upload(new File(['png'], 'photo.png', { type: 'image/png' })).subscribe();

    const req = http.expectOne(baseUrl);
    expect((req.request.body as FormData).has('alt')).toBe(false);
    req.flush({});
  });

  it('upload rejects unsupported types without calling the API', () => {
    let error: unknown;
    api.upload(new File(['svg'], 'icon.svg', { type: 'image/svg+xml' })).subscribe({
      error: (err: unknown) => (error = err),
    });

    expect(error).toBeInstanceOf(ClientValidationError);
    http.expectNone(baseUrl);
  });

  it('upload rejects files over 5 MB without calling the API', () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    let error: unknown;
    api.upload(big).subscribe({ error: (err: unknown) => (error = err) });

    expect(error).toBeInstanceOf(ClientValidationError);
    http.expectNone(baseUrl);
  });

  it('updateAlt sends a PATCH with { alt }', () => {
    api.updateAlt('507f1f77bcf86cd799439011', '').subscribe();

    const req = http.expectOne(`${baseUrl}/507f1f77bcf86cd799439011`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ alt: '' });
    req.flush({});
  });
});
