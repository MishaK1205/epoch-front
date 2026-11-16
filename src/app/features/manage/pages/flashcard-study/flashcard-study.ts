import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { FlashcardsApi } from '../../../../core/api/flashcards/flashcards-api';
import { Flashcard, FlashcardStatus } from '../../../../core/api/flashcards/flashcards.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import {
  FLASHCARD_DECKS_URL,
  flashcardDeleteMessage,
  flashcardsResetMessage,
} from '../../manage-labels';
import { findStudyDeck } from './flashcard-deck';

type Queue = 'all' | FlashcardStatus;
type Pending = 'known' | 'unknown' | 'reset' | 'delete';

function toQueue(value: string | undefined): Queue {
  return value === 'known' || value === 'unknown' ? value : 'all';
}

function toDirect(value: string | boolean | undefined): boolean {
  return value === true || value === 'true';
}

/**
 * Every card of one deck, on a single board. Used by `/flashcards`.
 * `embedded` hides the link back to the manage deck list.
 */
@Component({
  selector: 'app-flashcard-study',
  imports: [RouterLink, Alert, Button, ConfirmDialog, EmptyState, Icon, Spinner],
  templateUrl: './flashcard-study.html',
  styleUrls: ['../../manage-page.scss', './flashcard-study.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardStudy {
  private readonly categoriesApi = inject(FlashcardCategoriesApi);
  private readonly flashcardsApi = inject(FlashcardsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resetDialog = viewChild.required<ConfirmDialog>('resetDialog');
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly categoryId = input<string>();
  readonly subcategoryId = input<string>();
  readonly direct = input(false, { transform: toDirect });
  readonly queue = input('all', { transform: toQueue });
  /** The category page already shows the deck list, so the back link stays hidden. */
  readonly embedded = input(false);

  /** Fired after a mark, reset or delete so the category list can refresh its counts. */
  readonly deckChanged = output<void>();

  protected readonly homeUrl = computed(() =>
    this.embedded() ? '/flashcards' : FLASHCARD_DECKS_URL,
  );
  protected readonly newCardUrl = '/manage/flashcards/new';
  protected readonly queues: readonly { value: Queue; label: string }[] = [
    { value: 'all', label: 'ყველა' },
    { value: 'known', label: 'ვიცი' },
    { value: 'unknown', label: 'არ ვიცი' },
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
      return { ...query, status: queue === 'all' ? undefined : queue };
    },
    stream: ({ params }) => this.flashcardsApi.listAll(params),
  });

  protected readonly progressValue = computed(() =>
    this.progress.hasValue() ? this.progress.value() : null,
  );
  protected readonly cardItems = computed(() => (this.cards.hasValue() ? this.cards.value() : []));
  protected readonly knownPercent = computed(() => {
    const progress = this.progressValue();
    if (!progress || progress.total === 0) {
      return 0;
    }
    return Math.round((progress.known / progress.total) * 100);
  });
  protected readonly emptyDeck = computed(() => this.progressValue()?.total === 0);
  protected readonly finishedUnknown = computed(() => {
    const progress = this.progressValue();
    return (
      this.queue() === 'unknown' &&
      this.cards.hasValue() &&
      this.cardItems().length === 0 &&
      !!progress &&
      progress.unknown === 0 &&
      progress.total > 0
    );
  });
  protected readonly emptyQueueMessage = computed(() =>
    this.queue() === 'known'
      ? 'ამ კატეგორიაში ჯერ არც ერთი ბარათი არ იცით.'
      : 'ამ ფილტრს ბარათი არ შეესაბამება.',
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

  /** Hide answers so the board can be used as a quiz. Marks stay visible. */
  protected readonly answersHidden = signal(false);
  private readonly revealedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly pending = signal<Pending | null>(null);
  protected readonly pendingCardId = signal<string | null>(null);
  protected readonly toDelete = signal<Flashcard | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly deleteMessage = computed(() =>
    flashcardDeleteMessage(this.toDelete()?.front ?? ''),
  );

  protected countFor(queue: Queue): number | null {
    const progress = this.progressValue();
    if (!progress) {
      return null;
    }
    if (queue === 'known') {
      return progress.known;
    }
    if (queue === 'unknown') {
      return progress.unknown;
    }
    return progress.total;
  }

  protected answerVisible(id: string): boolean {
    return !this.answersHidden() || this.revealedIds().has(id);
  }

  protected toggleAnswers(): void {
    this.answersHidden.update((hidden) => !hidden);
    this.revealedIds.set(new Set());
  }

  protected reveal(id: string): void {
    this.revealedIds.update((ids) => new Set(ids).add(id));
  }

  protected retry(): void {
    this.categories.reload();
    this.progress.reload();
    this.cards.reload();
  }

  protected cardBusy(id: string): boolean {
    return this.pendingCardId() === id && this.pending() !== null && this.pending() !== 'reset';
  }

  protected know(card: Flashcard): void {
    if (card.known || this.pending()) {
      return;
    }
    this.mark(card, 'known');
  }

  protected forget(card: Flashcard): void {
    if (!card.known || this.pending()) {
      return;
    }
    this.mark(card, 'unknown');
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
    this.pendingCardId.set(null);
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
    this.pendingCardId.set(card.id);
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.flashcardsApi
      .delete(card.id)
      .pipe(
        finalize(() => {
          this.pending.set(null);
          this.pendingCardId.set(null);
        }),
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

  private mark(card: Flashcard, action: 'known' | 'unknown'): void {
    this.pending.set(action);
    this.pendingCardId.set(card.id);
    this.actionErrors.set([]);
    const request =
      action === 'known'
        ? this.flashcardsApi.markKnown(card.id)
        : this.flashcardsApi.markUnknown(card.id);
    request
      .pipe(
        finalize(() => {
          this.pending.set(null);
          this.pendingCardId.set(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.progress.reload();
          this.cards.reload();
          this.deckChanged.emit();
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }
}
