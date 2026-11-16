import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Role } from '../api/common.models';
import { AuthService } from './auth-service';
import { authInterceptor } from './auth-interceptor';

@Component({ template: '' })
class LoginStub {}

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: LoginStub }]),
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

  function logIn(role: Role = 'admin'): void {
    auth.login({ identifier: 'john', password: 'secret123' }).subscribe();
    controller.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'john',
        email: 'john@example.com',
        role,
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

  it('does not store a token for a non-admin login', () => {
    logIn('user');

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.isAdmin()).toBe(false);
    expect(auth.getToken()).toBeNull();
    expect(localStorage.getItem('epoch_access_token')).toBeNull();
  });

  it('logs out on 401 from a protected endpoint', () => {
    logIn();
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isAdmin()).toBe(true);

    http.get(`${environment.apiUrl}/auth/me`).subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getToken()).toBeNull();
  });

  it('logs out on 401 from register', () => {
    logIn();

    http.post(`${environment.apiUrl}/auth/register`, {}).subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/auth/register`)
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

  it('clears a stored non-admin token when /auth/me returns 403', async () => {
    localStorage.setItem('epoch_access_token', 'user-token');
    localStorage.setItem('epoch_access_token_expires_at', String(Date.now() + 60_000));

    const pending = auth.loadCurrentUser();
    controller
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({ message: 'Insufficient permissions' }, { status: 403, statusText: 'Forbidden' });
    await pending;

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getToken()).toBeNull();
    expect(localStorage.getItem('epoch_access_token')).toBeNull();
  });

  it('does not log out on 403 from another endpoint', () => {
    logIn();

    http
      .patch(`${environment.apiUrl}/users/507f1f77bcf86cd799439011/role`, { role: 'user' })
      .subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/users/507f1f77bcf86cd799439011/role`)
      .flush(
        { message: 'You cannot change your own role' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(auth.getToken()).toBe('token-123');
    expect(auth.isLoggedIn()).toBe(true);
  });
});
