import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { FlashcardsApi } from '../../../../core/api/flashcards/flashcards-api';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import { FLASHCARD_CATEGORIES_URL, flashcardsResetMessage } from '../../manage-labels';
import { flashcardDeckGroup } from './flashcard-deck-rows';

const STUDY_URL = '/flashcards';
const NEW_CARD_URL = '/manage/flashcards/new';

/** `/manage/flashcards` — category tree and the way into each deck. Admin only. */
@Component({
  selector: 'app-flashcard-decks',
  imports: [RouterLink, Alert, Button, ConfirmDialog, EmptyState, Icon, Spinner],
  templateUrl: './flashcard-decks.html',
  styleUrls: ['../../manage-page.scss', './flashcard-decks.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardDecks {
  private readonly categoriesApi = inject(FlashcardCategoriesApi);
  private readonly flashcardsApi = inject(FlashcardsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resetDialog = viewChild.required<ConfirmDialog>('resetDialog');

  protected readonly categoriesUrl = FLASHCARD_CATEGORIES_URL;
  protected readonly studyUrl = STUDY_URL;
  protected readonly newCardUrl = NEW_CARD_URL;
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly groups = computed(() =>
    (this.categories.hasValue() ? this.categories.value() : []).map(flashcardDeckGroup),
  );
  protected readonly loadErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );

  protected readonly pending = signal(false);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);

  protected retry(): void {
    this.categories.reload();
  }

  protected askResetAll(): void {
    this.resetDialog().open();
  }

  /** Clears every known mark of the current admin. Cards stay. */
  protected confirmResetAll(): void {
    if (this.pending()) {
      return;
    }
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.pending.set(true);
    this.flashcardsApi
      .reset({})
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.successMessage.set(flashcardsResetMessage(result.reset));
          this.categories.reload();
        },
        error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
      });
  }
}
