import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { TagsApi } from '../../../../core/api/tags/tags-api';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { Seo } from '../../../../core/services/seo';
import { SearchResults } from './search-results';

describe('SearchResults', () => {
  const search = vi.fn(() => of({ items: [], total: 0, page: 1, limit: 12 }));

  beforeEach(() => {
    search.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'search', component: SearchResults }], withComponentInputBinding()),
        { provide: ArticlesApi, useValue: { search } },
        { provide: TagsApi, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { isLoggedIn: signal(false) } },
        { provide: ReadingListStore, useValue: { readIds: signal(new Set<string>()) } },
        { provide: Seo, useValue: { update: vi.fn() } },
      ],
    });
  });

  it('sends no request without q', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/search');
    await harness.fixture.whenStable();

    expect(search).not.toHaveBeenCalled();
  });

  it('requests page 1 for an invalid page param', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/search?q=x&page=abc');
    await harness.fixture.whenStable();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ q: 'x', page: 1, limit: 12 });
  });
});
