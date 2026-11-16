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
import { currentPageActive, navigationTick } from '../../../../core/services/active-page';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { FlashcardsApi } from '../../../../core/api/flashcards/flashcards-api';
import { Flashcard, FlashcardStatus } from '../../../../core/api/flashcards/flashcards.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import { FLASHCARD_CREATED_STATE_KEY, flashcardDeleteMessage, toPage } from '../../manage-labels';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const NEW_CARD_URL = '/manage/flashcards/new';
const DELETED_MESSAGE = 'ფლეშბარათი წაიშალა.';
const ALREADY_DELETED_MESSAGE = 'ფლეშბარათი უკვე წაშლილი იყო. სია განახლდა.';
const CREATED_MESSAGE = 'ფლეშბარათი შეიქმნა.';
const UNKNOWN_CATEGORY = 'წაშლილი ან უცნობი კატეგორია';
const UNKNOWN_SUBCATEGORY = 'წაშლილი ან უცნობი ქვეკატეგორია';

type CardFilterStatus = 'all' | FlashcardStatus;

function toCardStatus(value: string | undefined): CardFilterStatus {
  return value === 'known' || value === 'unknown' ? value : 'all';
}

/** `/manage/flashcards/cards` — paginated table for managing cards. Not the study screen. */
@Component({
  selector: 'app-flashcard-cards',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Alert,
    Badge,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    Pagination,
    Select,
    Spinner,
  ],
  templateUrl: './flashcard-cards.html',
  styleUrls: ['../../manage-page.scss', './flashcard-cards.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardCards {
  private readonly flashcardsApi = inject(FlashcardsApi);
  private readonly categoriesApi = inject(FlashcardCategoriesApi);
  private readonly router = inject(Router);
  private readonly navigation = navigationTick();
  private readonly pageActive = currentPageActive();
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly page = input(1, { transform: toPage });
  readonly categoryId = input<string>();
  readonly subcategoryId = input<string>();
  readonly status = input('all', { transform: toCardStatus });

  protected readonly newCardUrl = NEW_CARD_URL;
  protected readonly statusFilters: readonly { value: CardFilterStatus; label: string }[] = [
    { value: 'all', label: 'ყველა' },
    { value: 'known', label: 'ცნობილი' },
    { value: 'unknown', label: 'უცნობი' },
  ];
  protected readonly categoryFilter = new FormControl('', { nonNullable: true });
  protected readonly subcategoryFilter = new FormControl('', { nonNullable: true });

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly tree = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  /** Parent shown in the select: the URL category, or the parent of a deep-linked subcategory. */
  protected readonly effectiveCategoryId = computed(() => {
    const categoryId = this.categoryId();
    if (categoryId) {
      return categoryId;
    }
    const subcategoryId = this.subcategoryId();
    if (!subcategoryId) {
      return '';
    }
    return (
      this.tree().find((category) =>
        category.subcategories.some((subcategory) => subcategory.id === subcategoryId),
      )?.id ?? ''
    );
  });
  protected readonly selectedCategory = computed(() =>
    this.tree().find((category) => category.id === this.effectiveCategoryId()),
  );
  protected readonly unknownCategory = computed(() => {
    const id = this.categoryId();
    return (
      !!id && this.categories.hasValue() && !this.tree().some((category) => category.id === id)
    );
  });
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const options = this.tree().map((category) => ({ value: category.id, label: category.name }));
    const id = this.categoryId();
    return id && this.unknownCategory()
      ? [...options, { value: id, label: UNKNOWN_CATEGORY }]
      : options;
  });
  protected readonly subcategoryOptions = computed<SelectOption[]>(() => {
    const options = (this.selectedCategory()?.subcategories ?? []).map((subcategory) => ({
      value: subcategory.id,
      label: subcategory.name,
    }));
    const id = this.subcategoryId();
    if (id && !options.some((option) => option.value === id)) {
      options.push({ value: id, label: UNKNOWN_SUBCATEGORY });
    }
    return options;
  });
  protected readonly filtered = computed(
    () => !!this.categoryId() || !!this.subcategoryId() || this.status() !== 'all',
  );
  protected readonly newCardParams = computed(() => ({
    categoryId: this.effectiveCategoryId() || null,
    subcategoryId: this.subcategoryId() || null,
  }));

  protected readonly cards = rxResource({
    params: () => {
      const status = this.status();
      return {
        page: this.page(),
        categoryId: this.categoryId() || undefined,
        subcategoryId: this.subcategoryId() || undefined,
        status: status === 'all' ? undefined : status,
      };
    },
    stream: ({ params }) => this.flashcardsApi.list({ ...params, limit: PAGE_SIZE }),
  });
  protected readonly items = computed(() =>
    this.cards.hasValue() ? this.cards.value().items : [],
  );
  protected readonly totalPages = computed(() =>
    this.cards.hasValue() ? Math.ceil(this.cards.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.cards.error() ? getManageErrorMessages(this.cards.error()) : [],
  );

  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<Flashcard | null>(null);
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[FLASHCARD_CREATED_STATE_KEY] === true
      ? CREATED_MESSAGE
      : '',
  );
  protected readonly deleteMessage = computed(() =>
    flashcardDeleteMessage(this.toDelete()?.front ?? ''),
  );

  constructor() {
    effect(() => this.categoryFilter.setValue(this.effectiveCategoryId(), { emitEvent: false }));
    effect(() => this.subcategoryFilter.setValue(this.subcategoryId() ?? '', { emitEvent: false }));
    effect(() => {
      this.navigation();
      if (!this.pageActive() || !this.cards.hasValue()) {
        return;
      }
      const { items, total } = this.cards.value();
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

  protected clearFilters(): void {
    void this.router.navigate([], {
      queryParams: { categoryId: null, subcategoryId: null, status: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected filterByCategory(categoryId: string): void {
    void this.router.navigate([], {
      queryParams: { categoryId: categoryId || null, subcategoryId: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected filterBySubcategory(subcategoryId: string): void {
    void this.router.navigate([], {
      queryParams: {
        categoryId: this.categoryFilter.value || this.categoryId() || null,
        subcategoryId: subcategoryId || null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.cards.reload();
  }

  protected askDelete(card: Flashcard): void {
    this.toDelete.set(card);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const card = this.toDelete();
    if (!card || this.pendingId()) {
      return;
    }
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.pendingId.set(card.id);
    this.flashcardsApi
      .delete(card.id)
      .pipe(
        finalize(() => this.pendingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(DELETED_MESSAGE);
          this.cards.reload();
          this.categories.reload();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.successMessage.set(ALREADY_DELETED_MESSAGE);
            this.cards.reload();
            this.categories.reload();
          } else {
            this.actionErrors.set(getManageErrorMessages(err));
          }
        },
      });
  }
}
