import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import {
  API_LIMITS,
  getApiErrorMessages,
  QuizCategoriesApi,
  QuizzesApi,
} from '../../../../core/api';
import { currentPageActive } from '../../../../core/services/active-page';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const SEARCH_MAX = API_LIMITS.quiz.titleSearch.max;

/** `/quizzes?page=&categoryId=&q=` — every quiz, newest first; opens the play page. */
@Component({
  selector: 'app-quiz-browse',
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    Alert,
    Button,
    EmptyState,
    Icon,
    InputField,
    Pagination,
    Spinner,
  ],
  templateUrl: './quiz-browse.html',
  styleUrl: './quiz-browse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBrowse {
  private readonly api = inject(QuizzesApi);
  private readonly categoriesApi = inject(QuizCategoriesApi);
  private readonly router = inject(Router);
  private readonly pageActive = currentPageActive();

  readonly page = input(1, { transform: toPage });
  readonly categoryId = input<string>();
  readonly q = input<string>();

  protected readonly searchMax = SEARCH_MAX;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly categoryChips = computed(() =>
    this.categories.hasValue()
      ? this.categories.value().filter((category) => category.totalQuizCount > 0)
      : [],
  );
  /** The chosen top-level category, so its subcategories can be offered too. */
  protected readonly activeParent = computed(() => {
    const id = this.categoryId();
    return (
      this.categoryChips().find(
        (category) => category.id === id || category.subcategories.some((sub) => sub.id === id),
      ) ?? null
    );
  });
  protected readonly subcategoryChips = computed(
    () => this.activeParent()?.subcategories.filter((sub) => sub.quizCount > 0) ?? [],
  );

  protected readonly quizzes = rxResource({
    params: () => ({
      page: this.page(),
      categoryId: this.categoryId(),
      q: this.q()?.trim().slice(0, SEARCH_MAX) || undefined,
    }),
    stream: ({ params }) => this.api.list({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly items = computed(() =>
    this.quizzes.hasValue() ? this.quizzes.value().items : [],
  );
  protected readonly totalPages = computed(() =>
    this.quizzes.hasValue() ? Math.ceil(this.quizzes.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.quizzes.error() ? getApiErrorMessages(this.quizzes.error()) : [],
  );
  protected readonly filtered = computed(() => !!this.categoryId() || !!this.q());

  constructor() {
    effect(() => this.search.setValue(this.q() ?? '', { emitEvent: false }));
    this.search.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        if (this.pageActive() && value !== (this.q() ?? '')) {
          void this.router.navigate([], {
            queryParams: { q: value || null, page: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.quizzes.reload();
  }
}
