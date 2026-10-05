import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
  catchError,
  debounce,
  distinctUntilChanged,
  filter,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { HighlightText } from '../../../shared/ui/highlight-text/highlight-text';
import { Icon } from '../../../shared/ui/icon/icon';
import { Spinner } from '../../../shared/ui/spinner/spinner';
import {
  containsAllTerms,
  matchingTags,
  normalizeSearchQuery,
} from '../../../shared/utils/highlight';
import { API_LIMITS } from '../../api/api-limits';
import { ArticlesApi } from '../../api/articles/articles-api';
import { ArticleSummary } from '../../api/articles/articles.models';

/** One Georgian letter matches too many titles to be useful. */
export const SUGGEST_MIN_LENGTH = 2;
export const SUGGEST_LIMIT = 5;
export const SUGGEST_DEBOUNCE_MS = 300;

type SuggestState =
  | { status: 'idle' }
  | { status: 'loading'; q: string }
  | { status: 'done'; q: string; items: ArticleSummary[]; total: number }
  | { status: 'error'; q: string };

interface Suggestions {
  q: string;
  total: number;
  options: { id: string; article: ArticleSummary; tags: string[] }[];
}

let nextId = 0;

/**
 * Header search (ARIA combobox): live suggestions from `GET /articles/search` from 2 characters,
 * Enter / the icon opens `/search?q=`. Below `lg` it collapses to an icon that expands the field
 * over the header bar (the bar must be `position: relative`). The field mirrors `q` on `/search`
 * and is cleared after any other navigation.
 */
@Component({
  selector: 'app-search-box',
  imports: [NgOptimizedImage, HighlightText, Icon, Spinner],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.search-box--expanded]': 'expanded()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class SearchBox {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  private readonly idPrefix = `search-box-${nextId++}`;
  protected readonly ids = {
    form: `${this.idPrefix}-form`,
    input: `${this.idPrefix}-input`,
    list: `${this.idPrefix}-list`,
    all: `${this.idPrefix}-all`,
  };
  protected readonly maxLength = API_LIMITS.search.max;

  protected readonly text = signal('');
  private readonly open = signal(false);
  /** Mobile only: the field is expanded over the header bar. */
  protected readonly expanded = signal(false);
  protected readonly activeIndex = signal(-1);
  private readonly query$ = new Subject<string>();

  protected readonly query = computed(() => normalizeSearchQuery(this.text()));

  protected readonly state = toSignal(
    this.query$.pipe(
      map(normalizeSearchQuery),
      // Too-short values skip the debounce so the pending request is cancelled right away.
      debounce((q) => timer(q.length < SUGGEST_MIN_LENGTH ? 0 : SUGGEST_DEBOUNCE_MS)),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.length < SUGGEST_MIN_LENGTH) {
          return of<SuggestState>({ status: 'idle' });
        }
        return this.articlesApi.search({ q, limit: SUGGEST_LIMIT }).pipe(
          map((page): SuggestState => ({ status: 'done', q, items: page.items, total: page.total })),
          startWith<SuggestState>({ status: 'loading', q }),
          catchError(() => of<SuggestState>({ status: 'error', q })),
        );
      }),
    ),
    { initialValue: { status: 'idle' } as SuggestState },
  );

  /** The last loaded suggestions; kept while the next ones load so the list doesn't flicker. */
  protected readonly suggestions = linkedSignal<SuggestState, Suggestions | null>({
    source: this.state,
    computation: (state, previous) => {
      if (state.status === 'loading') {
        return previous?.value ?? null;
      }
      if (state.status !== 'done') {
        return null;
      }
      return {
        q: state.q,
        total: state.total,
        options: state.items.map((article, index) => ({
          id: `${this.ids.list}-${index}`,
          article,
          tags: containsAllTerms(article.title, state.q)
            ? []
            : matchingTags(article.tags, state.q).slice(0, 2),
        })),
      };
    },
  });

  protected readonly showAll = computed(() => (this.suggestions()?.total ?? 0) > SUGGEST_LIMIT);
  private readonly optionIds = computed(() => [
    ...(this.suggestions()?.options.map((option) => option.id) ?? []),
    ...(this.showAll() ? [this.ids.all] : []),
  ]);
  protected readonly panelOpen = computed(
    () =>
      this.open() &&
      this.query().length >= SUGGEST_MIN_LENGTH &&
      this.state().status !== 'idle',
  );
  protected readonly activeId = computed(() =>
    this.panelOpen() ? (this.optionIds()[this.activeIndex()] ?? null) : null,
  );
  protected readonly statusMessage = computed(() => {
    const state = this.state();
    if (!this.panelOpen()) {
      return '';
    }
    switch (state.status) {
      case 'loading':
        return 'ძიება…';
      case 'error':
        return 'ძიება ახლა მიუწვდომელია';
      case 'done':
        return state.total === 0
          ? `„${state.q}“ — ვერაფერი მოიძებნა`
          : `ნაპოვნია ${state.total} სტატია`;
      default:
        return '';
    }
  });

  constructor() {
    this.syncWithUrl(this.router.url);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.collapse();
        this.syncWithUrl(event.urlAfterRedirects);
      });
  }

  protected onInput(value: string): void {
    this.text.set(value);
    this.open.set(true);
    this.activeIndex.set(-1);
    this.query$.next(value);
  }

  protected onFocus(): void {
    this.open.set(true);
    this.query$.next(this.text());
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.optionIds().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (count === 0) {
          return;
        }
        event.preventDefault();
        if (!this.panelOpen()) {
          this.open.set(true);
        }
        const current = this.activeIndex();
        const next =
          event.key === 'ArrowDown' ? (current + 1) % count : current <= 0 ? count - 1 : current - 1;
        this.activeIndex.set(next);
        return;
      }
      case 'Enter': {
        event.preventDefault();
        const option = this.panelOpen()
          ? this.suggestions()?.options[this.activeIndex()]
          : undefined;
        if (option) {
          this.openArticle(option.article);
        } else {
          this.submit();
        }
        return;
      }
      case 'Escape':
        event.preventDefault();
        if (this.panelOpen()) {
          this.close();
        } else if (this.text()) {
          this.text.set('');
          this.query$.next('');
        } else {
          this.collapse();
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  protected submit(): void {
    const q = this.query();
    if (!q) {
      return;
    }
    this.close();
    void this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected openArticle(article: ArticleSummary): void {
    this.close();
    void this.router.navigate(['/articles', article.slug]);
  }

  protected expand(): void {
    this.expanded.set(true);
    afterNextRender(() => this.input().nativeElement.focus(), { injector: this.injector });
  }

  protected collapse(): void {
    this.expanded.set(false);
    this.close();
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!(event.target instanceof Node) || !this.host.nativeElement.contains(event.target)) {
      this.collapse();
    }
  }

  private close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  /** Mirrors `q` on `/search`, clears the field elsewhere. Suggestions reload on next focus. */
  private syncWithUrl(url: string): void {
    const tree = this.router.parseUrl(url);
    const path = tree.root.children['primary']?.segments.map((segment) => segment.path).join('/');
    this.text.set(path === 'search' ? (tree.queryParamMap.get('q') ?? '') : '');
    this.query$.next('');
  }
}
