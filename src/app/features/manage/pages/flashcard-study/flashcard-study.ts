import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { FlashcardsApi } from '../../../../core/api/flashcards/flashcards-api';
import { Flashcard, FlashcardStatus } from '../../../../core/api/flashcards/flashcards.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import {
  FLASHCARD_DECKS_URL,
  flashcardDeleteMessage,
  flashcardsResetMessage,
  toPage,
} from '../../manage-labels';
import { findStudyDeck } from './flashcard-deck';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;
const NEW_CARD_URL = '/manage/flashcards/new';

type Queue = 'unknown' | FlashcardStatus | 'all';
type Pending = 'known' | 'unknown' | 'reset' | 'delete';

function toQueue(value: string | undefined): Queue {
  return value === 'known' || value === 'all' ? value : 'unknown';
}

function toDirect(value: string | boolean | undefined): boolean {
  return value === true || value === 'true';
}

/**
 * Flip through one deck. Used by `/flashcards` and, if opened directly, by the
 * manage study route. `embedded` hides the link back to the deck list.
 */
@Component({
  selector: 'app-flashcard-study',
  imports: [RouterLink, Alert, Button, ConfirmDialog, EmptyState, Icon, Pagination, Spinner],
  templateUrl: './flashcard-study.html',
  styleUrls: ['../../manage-page.scss', './flashcard-study.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class FlashcardStudy {
  private readonly categoriesApi = inject(FlashcardCategoriesApi);
  private readonly flashcardsApi = inject(FlashcardsApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resetDialog = viewChild.required<ConfirmDialog>('resetDialog');
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly categoryId = input<string>();
  readonly subcategoryId = input<string>();
  readonly direct = input(false, { transform: toDirect });
  readonly page = input(1, { transform: toPage });
  readonly queue = input('unknown', { transform: toQueue });
  /** The category page already shows the deck list, so the back link stays hidden. */
  readonly embedded = input(false);

  /** Fired after a mark, reset or delete so the category list can refresh its counts. */
  readonly deckChanged = output<void>();

  protected readonly homeUrl = computed(() =>
    this.embedded() ? '/flashcards' : FLASHCARD_DECKS_URL,
  );
  protected readonly newCardUrl = NEW_CARD_URL;
  protected readonly queues: readonly { value: Queue; label: string }[] = [
    { value: 'unknown', label: 'უცნობი' },
    { value: 'known', label: 'ცნობილი' },
    { value: 'all', label: 'ყველა' },
  ];

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly deck = computed(() => {
    if (!this.categories.hasValue()) {
      return null;
    }
    return findStudyDeck(this.categories.value(), {
      categoryId: this.categoryId(),
      subcategoryId: this.subcategoryId(),
      direct: this.direct(),
    });
  });
  protected readonly deckMissing = computed(
    () => this.categories.hasValue() && this.deck() === null,
  );

  protected readonly progress = rxResource({
    params: () => this.deck()?.listQuery,
    stream: ({ params }) => this.flashcardsApi.progress(params),
  });
  protected readonly cards = rxResource({
    params: () => {
      const query = this.deck()?.listQuery;
      if (!query) {
        return undefined;
      }
      const queue = this.queue();
      return {
        ...query,
        page: this.page(),
        limit: PAGE_SIZE,
        status: queue === 'all' ? undefined : queue,
      };
    },
    stream: ({ params }) => this.flashcardsApi.list(params),
  });

  protected readonly progressValue = computed(() =>
    this.progress.hasValue() ? this.progress.value() : null,
  );
  protected readonly cardItems = computed(() =>
    this.cards.hasValue() ? this.cards.value().items : [],
  );
  protected readonly queueTotal = computed(() =>
    this.cards.hasValue() ? this.cards.value().total : 0,
  );
  protected readonly totalPages = computed(() => Math.ceil(this.queueTotal() / PAGE_SIZE));
  private readonly queueKey = computed(
    () =>
      `${this.categoryId() ?? ''}|${this.subcategoryId() ?? ''}|${this.direct()}|${this.queue()}|${this.page()}`,
  );
  protected readonly cardIndex = linkedSignal({
    source: this.queueKey,
    computation: () => 0,
  });
  protected readonly safeIndex = computed(() => {
    const length = this.cardItems().length;
    if (length === 0) {
      return 0;
    }
    return Math.min(this.cardIndex(), length - 1);
  });
  protected readonly card = computed(() => this.cardItems()[this.safeIndex()] ?? null);
  protected readonly revealed = linkedSignal({
    source: () => this.card()?.id ?? null,
    computation: () => false,
  });
  protected readonly queuePosition = computed(
    () => (this.page() - 1) * PAGE_SIZE + this.safeIndex() + 1,
  );
  protected readonly emptyDeck = computed(() => this.progressValue()?.total === 0);
  protected readonly finishedUnknown = computed(() => {
    const progress = this.progressValue();
    return (
      this.queue() === 'unknown' &&
      this.cards.hasValue() &&
      this.queueTotal() === 0 &&
      !!progress &&
      progress.unknown === 0 &&
      progress.total > 0
    );
  });
  protected readonly emptyQueueMessage = computed(() =>
    this.queue() === 'known' ? 'ცნობილი ბარათი ჯერ არ გაქვთ.' : 'ამ რიგში ბარათი არ არის.',
  );
  protected readonly loading = computed(() => {
    if (this.categories.isLoading() && !this.categories.hasValue()) {
      return true;
    }
    if (!this.deck()) {
      return false;
    }
    return (
      (this.progress.isLoading() && !this.progress.hasValue()) ||
      (this.cards.isLoading() && !this.cards.hasValue())
    );
  });
  protected readonly loadErrors = computed(() => {
    const err = this.categories.error() ?? this.progress.error() ?? this.cards.error();
    return err ? getManageErrorMessages(err) : [];
  });

  protected readonly pending = signal<Pending | null>(null);
  protected readonly toDelete = signal<Flashcard | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly deleteMessage = computed(() =>
    flashcardDeleteMessage(this.toDelete()?.front ?? ''),
  );

  constructor() {
    effect(() => {
      if (!this.cards.hasValue() || !this.deck()) {
        return;
      }
      const { items, total } = this.cards.value();
      const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (items.length === 0 && total > 0 && this.page() > lastPage) {
        this.goToPage(lastPage);
      }
    });
  }

  protected retry(): void {
    this.categories.reload();
    this.progress.reload();
    this.cards.reload();
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected reveal(): void {
    this.revealed.set(true);
  }

  protected next(): void {
    const length = this.cardItems().length;
    const index = this.safeIndex();
    if (index < length - 1) {
      this.cardIndex.set(index + 1);
      return;
    }
    if (this.page() < this.totalPages()) {
      this.goToPage(this.page() + 1);
    }
  }

  protected previous(): void {
    const index = this.safeIndex();
    if (index > 0) {
      this.cardIndex.set(index - 1);
      return;
    }
    if (this.page() > 1) {
      this.goToPage(this.page() - 1);
    }
  }

  protected know(): void {
    const card = this.card();
    if (!card || this.pending()) {
      return;
    }
    const leaveInPlace = this.queue() === 'unknown';
    this.pending.set('known');
    this.actionErrors.set([]);
    this.flashcardsApi
      .markKnown(card.id)
      .pipe(
        finalize(() => this.pending.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.progress.reload();
          this.cards.reload();
          this.deckChanged.emit();
          if (!leaveInPlace) {
            this.next();
          }
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }

  protected stillLearning(): void {
    const card = this.card();
    if (!card || this.pending()) {
      return;
    }
    if (!card.known) {
      this.next();
      return;
    }
    const leaveInPlace = this.queue() === 'known';
    this.pending.set('unknown');
    this.actionErrors.set([]);
    this.flashcardsApi
      .markUnknown(card.id)
      .pipe(
        finalize(() => this.pending.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.progress.reload();
          this.cards.reload();
          this.deckChanged.emit();
          if (!leaveInPlace) {
            this.next();
          }
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }

  protected askReset(): void {
    this.resetDialog().open();
  }

  protected confirmReset(): void {
    const deck = this.deck();
    if (!deck || this.pending()) {
      return;
    }
    this.pending.set('reset');
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.flashcardsApi
      .reset(deck.resetBody)
      .pipe(
        finalize(() => this.pending.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.successMessage.set(flashcardsResetMessage(result.reset));
          this.progress.reload();
          this.cards.reload();
          this.deckChanged.emit();
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }

  protected askDelete(card: Flashcard): void {
    this.toDelete.set(card);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const card = this.toDelete();
    if (!card || this.pending()) {
      return;
    }
    this.pending.set('delete');
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.flashcardsApi
      .delete(card.id)
      .pipe(
        finalize(() => this.pending.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMessage.set('ფლეშბარათი წაიშალა.');
          this.progress.reload();
          this.cards.reload();
          this.deckChanged.emit();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.successMessage.set('ფლეშბარათი უკვე წაშლილი იყო.');
            this.progress.reload();
            this.cards.reload();
            this.deckChanged.emit();
          } else {
            this.actionErrors.set(getManageErrorMessages(err));
          }
        },
      });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('input, textarea, select, dialog')) {
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if ((event.key === ' ' || event.key === 'Enter') && !this.revealed()) {
      if (target.closest('button, a')) {
        return;
      }
      event.preventDefault();
      this.reveal();
    }
  }
}
