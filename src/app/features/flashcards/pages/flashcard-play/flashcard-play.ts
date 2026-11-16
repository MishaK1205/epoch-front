import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { Alert } from '../../../../shared/ui/alert/alert';
import { getManageErrorMessages } from '../../../manage/manage-errors';
import {
  FlashcardDeckGroup,
  FlashcardDeckRow,
  flashcardDeckGroup,
} from '../../../manage/pages/flashcard-decks/flashcard-deck-rows';
import { FlashcardStudy } from '../../../manage/pages/flashcard-study/flashcard-study';

type Queue = 'unknown' | 'known' | 'all';

function toDirect(value: string | boolean | undefined): boolean {
  return value === true || value === 'true';
}

function toQueue(value: string | undefined): Queue {
  return value === 'known' || value === 'unknown' ? value : 'all';
}

/**
 * `/flashcards` — categories on the side, the chosen deck in the main column.
 * Creating and editing stays in `/manage/flashcards`.
 */
@Component({
  selector: 'app-flashcard-play',
  imports: [RouterLink, Alert, Button, EmptyState, Icon, Spinner, FlashcardStudy],
  templateUrl: './flashcard-play.html',
  styleUrl: './flashcard-play.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-allow-copy': '' },
})
export class FlashcardPlay {
  private readonly categoriesApi = inject(FlashcardCategoriesApi);

  readonly categoryId = input<string>();
  readonly subcategoryId = input<string>();
  readonly direct = input(false, { transform: toDirect });
  readonly queue = input('all', { transform: toQueue });

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly groups = computed(() =>
    this.categories.hasValue() ? this.categories.value().map(flashcardDeckGroup) : [],
  );
  protected readonly loadErrors = computed(() => {
    const err = this.categories.error();
    return err ? getManageErrorMessages(err) : [];
  });
  protected readonly deckSelected = computed(() => !!(this.categoryId() || this.subcategoryId()));
  /** Matches the row ids from `flashcardDeckGroup`. A subcategory id wins. */
  protected readonly currentRowId = computed(() => {
    const subcategoryId = this.subcategoryId();
    if (subcategoryId) {
      return subcategoryId;
    }
    const categoryId = this.categoryId();
    if (!categoryId) {
      return null;
    }
    return this.direct() ? `${categoryId}:direct` : `${categoryId}:all`;
  });

  protected retry(): void {
    this.categories.reload();
  }

  protected nestedRows(group: FlashcardDeckGroup): FlashcardDeckRow[] {
    return group.rows.filter((row) => row.kind !== 'all');
  }

  protected rowLabel(row: FlashcardDeckRow): string {
    if (row.kind === 'direct') {
      return 'ამ კატეგორიაში';
    }
    return row.name;
  }

  protected meter(known: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Math.round((known / total) * 100);
  }
}
