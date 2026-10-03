import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/auth-service';
import { ReadingListToggle } from './reading-list-toggle';

const ARTICLE_ID = '507f1f77bcf86cd799439011';

describe('ReadingListToggle', () => {
  let fixture: ComponentFixture<ReadingListToggle>;
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ReadingListToggle);
    fixture.componentRef.setInput('articleId', ARTICLE_ID);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  function logIn(): void {
    auth.login({ identifier: 'john', password: 'secret123' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: '507f1f77bcf86cd799439099',
        username: 'john',
        email: 'john@example.com',
        role: 'user',
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    });
    TestBed.tick();
    for (const path of ['saved-articles', 'read-articles']) {
      http
        .expectOne((r) => r.url === `${environment.apiUrl}/me/${path}`)
        .flush({ items: [], total: 0, page: 1, limit: 100 });
    }
    fixture.detectChanges();
  }

  it('sends guests to the login page with a returnUrl', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    button().click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: router.url },
    });
    http.expectNone((r) => r.url.includes('/me/'));
  });

  it('saves optimistically and shows the active label once confirmed', async () => {
    logIn();
    expect(button().textContent).toContain('შენახვა');
    expect(button().getAttribute('aria-pressed')).toBe('false');

    button().click();
    fixture.detectChanges();
    expect(button().getAttribute('aria-pressed')).toBe('true');

    const req = http.expectOne(`${environment.apiUrl}/me/saved-articles/${ARTICLE_ID}`);
    expect(req.request.method).toBe('PUT');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().textContent).toContain('შენახულია');
    expect(button().classList.contains('toggle--active')).toBe(true);
  });

  it('rolls back and shows the message when marking read fails with 404', async () => {
    fixture.componentRef.setInput('kind', 'read');
    logIn();

    button().click();
    http
      .expectOne(`${environment.apiUrl}/me/read-articles/${ARTICLE_ID}`)
      .flush(
        { statusCode: 404, message: 'Article not found', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().getAttribute('aria-pressed')).toBe('false');
    const error: HTMLElement | null = fixture.nativeElement.querySelector('.toggle__error');
    expect(error?.textContent).toContain('აღარ არის ხელმისაწვდომი');
  });
});
