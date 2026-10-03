import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth-service';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  function logIn(): void {
    auth.login({ identifier: 'john', password: 'secret123' }).subscribe();
    controller.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'john',
        email: 'john@example.com',
        role: 'moderator',
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    });
  }

  it('attaches the token to API requests only', () => {
    logIn();

    http.get(`${environment.apiUrl}/auth/me`).subscribe();
    http.get('https://other-host.example.com/data').subscribe();

    const apiReq = controller.expectOne(`${environment.apiUrl}/auth/me`);
    expect(apiReq.request.headers.get('Authorization')).toBe('Bearer token-123');
    apiReq.flush({});

    const otherReq = controller.expectOne('https://other-host.example.com/data');
    expect(otherReq.request.headers.has('Authorization')).toBe(false);
    otherReq.flush({});
  });

  it('logs out on 401 from a protected endpoint', () => {
    logIn();
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.canWriteArticles()).toBe(true);

    http.get(`${environment.apiUrl}/auth/me`).subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getToken()).toBeNull();
  });

  it('does not log out on 401 from login', () => {
    logIn();

    auth.login({ identifier: 'john', password: 'wrong' }).subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBe('token-123');
  });
});
