import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Paginated } from '../../../shared/models/paginated';
import { ArticlesApi } from '../../api/articles/articles-api';
import { ArticleSummary, SearchArticlesQuery } from '../../api/articles/articles.models';
import { SearchBox } from './search-box';

function article(id: string, title: string, tags: string[] = []): ArticleSummary {
  return {
    id,
    title,
    slug: id,
    excerpt: '',
    coverImage: null,
    category: { id: 'c1', name: 'მუსიკა', slug: 'music' },
    subcategory: null,
    tags,
    author: null,
    status: 'published',
    publishedAt: '2026-10-05T14:23:00.000Z',
    createdAt: '2026-10-05T14:22:00.000Z',
    updatedAt: '2026-10-05T14:23:00.000Z',
  };
}

describe('SearchBox', () => {
  let fixture: ComponentFixture<SearchBox>;
  let input: HTMLInputElement;
  let search: ReturnType<typeof vi.fn<(query: SearchArticlesQuery) => Observable<Paginated<ArticleSummary>>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    search = vi.fn((query: SearchArticlesQuery) =>
      of({ items: [], total: 0, page: 1, limit: query.limit ?? 20 }),
    );
    TestBed.configureTestingModule({
      imports: [SearchBox],
      providers: [provideRouter([]), { provide: ArticlesApi, useValue: { search } }],
    });
    fixture = TestBed.createComponent(SearchBox);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  afterEach(() => vi.useRealTimers());

  function type(value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('sends no request for a single character', () => {
    type('ს');
    vi.advanceTimersByTime(1000);
    expect(search).not.toHaveBeenCalled();
  });

  it('sends one request 300 ms after fast typing, with a normalized query', () => {
    type('ს');
    type('სე');
    type('  სებ   ბა ');
    vi.advanceTimersByTime(299);
    expect(search).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ q: 'სებ ბა', limit: 5 });
  });

  it('cancels the pending request when a newer query arrives', () => {
    const cancelled: string[] = [];
    search.mockImplementation(
      (query) => new Observable<Paginated<ArticleSummary>>(() => () => cancelled.push(query.q)),
    );

    type('ბახ');
    vi.advanceTimersByTime(300);
    type('ბახი');
    vi.advanceTimersByTime(300);

    expect(search).toHaveBeenCalledTimes(2);
    expect(cancelled).toEqual(['ბახ']);
  });

  it('lists suggestions with highlights, tag chips and "see all"', () => {
    search.mockReturnValue(
      of({
        items: [
          article('a1', 'Baroque organ music', ['იოჰან სებასტიან ბახი']),
          article('a2', 'იოჰან სებასტიან ბახი'),
        ],
        total: 7,
        page: 1,
        limit: 5,
      }),
    );

    input.dispatchEvent(new Event('focus'));
    type('სებას');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const options = element.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.search-box__tag')?.textContent).toContain('სებას');
    expect(options[1].querySelector('mark')?.textContent).toBe('სებას');
    expect(options[2].textContent).toContain('7');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2].id);
  });
});
