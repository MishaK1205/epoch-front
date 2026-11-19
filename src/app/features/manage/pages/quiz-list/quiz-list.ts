import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { QuizCategoriesApi } from '../../../../core/api/quizzes/quiz-categories-api';
import { QuizzesApi } from '../../../../core/api/quizzes/quizzes-api';
import { QuizSummary } from '../../../../core/api/quizzes/quizzes.models';
import { currentPageActive, navigationTick } from '../../../../core/services/active-page';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Select, SelectOption, SelectOptionGroup } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import {
  QUIZ_CATEGORIES_URL,
  QUIZ_DELETED_STATE_KEY,
  QUIZ_PLAY_URL,
  quizDeleteMessage,
  QUIZZES_URL,
  toPage,
} from '../../manage-labels';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const DELETED_MESSAGE = 'ქვიზი წაიშალა.';
const ALREADY_DELETED_MESSAGE = 'ქვიზი უკვე წაშლილი იყო. სია განახლდა.';

/**
 * `/manage/quizzes?page=&categoryId=` — quizzes, newest first. `categoryId` may be a category
 * (its subcategories included) or a subcategory.
 */
@Component({
  selector: 'app-quiz-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    Pagination,
    Select,
    Spinner,
  ],
  templateUrl: './quiz-list.html',
  styleUrls: ['../../manage-page.scss', './quiz-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizList {
  private readonly api = inject(QuizzesApi);
  private readonly categoriesApi = inject(QuizCategoriesApi);
  private readonly router = inject(Router);
  private readonly navigation = navigationTick();
  private readonly pageActive = currentPageActive();
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly page = input(1, { transform: toPage });
  readonly categoryId = input<string>();

  protected readonly listUrl = QUIZZES_URL;
  protected readonly categoriesUrl = QUIZ_CATEGORIES_URL;
  protected readonly playUrl = QUIZ_PLAY_URL;
  protected readonly categoryFilter = new FormControl('', { nonNullable: true });
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  /** A category with children is a group: the whole category first, then each subcategory. */
  protected readonly categoryOptions = computed<(SelectOption | SelectOptionGroup)[]>(() =>
    (this.categories.hasValue() ? this.categories.value() : []).map((category) =>
      category.subcategories.length === 0
        ? { value: category.id, label: `${category.name} (${category.totalQuizCount})` }
        : {
            group: category.name,
            options: [
              {
                value: category.id,
                label: `ყველა — ${category.name} (${category.totalQuizCount})`,
              },
              ...category.subcategories.map((sub) => ({
                value: sub.id,
                label: `${sub.name} (${sub.quizCount})`,
              })),
            ],
          },
    ),
  );

  protected readonly quizzes = rxResource({
    params: () => ({ page: this.page(), categoryId: this.categoryId() }),
    stream: ({ params }) => this.api.list({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly items = computed(() =>
    this.quizzes.hasValue() ? this.quizzes.value().items : [],
  );
  protected readonly newQuizParams = computed(() => ({ categoryId: this.categoryId() || null }));
  protected readonly totalPages = computed(() =>
    this.quizzes.hasValue() ? Math.ceil(this.quizzes.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.quizzes.error() ? getManageErrorMessages(this.quizzes.error()) : [],
  );

  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<QuizSummary | null>(null);
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[QUIZ_DELETED_STATE_KEY] === true
      ? DELETED_MESSAGE
      : '',
  );
  protected readonly deleteMessage = computed(() =>
    quizDeleteMessage(this.toDelete()?.title ?? ''),
  );

  constructor() {
    effect(() => this.categoryFilter.setValue(this.categoryId() ?? '', { emitEvent: false }));
    // A page past the end (e.g. after deleting the last item on it): go to the last page.
    effect(() => {
      this.navigation();
      if (!this.pageActive() || !this.quizzes.hasValue()) {
        return;
      }
      const { items, total } = this.quizzes.value();
      const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (items.length === 0 && total > 0 && this.page() > lastPage) {
        this.goToPage(lastPage, true);
      }
    });
  }

  protected goToPage(page: number, replaceUrl = false): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected filterByCategory(categoryId: string): void {
    void this.router.navigate([], {
      queryParams: { categoryId: categoryId || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.quizzes.reload();
  }

  protected askDelete(quiz: QuizSummary): void {
    this.toDelete.set(quiz);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const quiz = this.toDelete();
    if (!quiz || this.pendingId()) {
      return;
    }
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.pendingId.set(quiz.id);
    this.api
      .delete(quiz.id)
      .pipe(
        finalize(() => this.pendingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.deleted(DELETED_MESSAGE),
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.deleted(ALREADY_DELETED_MESSAGE);
          } else {
            this.actionErrors.set(getManageErrorMessages(err));
          }
        },
      });
  }

  private deleted(message: string): void {
    this.successMessage.set(message);
    this.quizzes.reload();
    this.categories.reload();
  }
}
