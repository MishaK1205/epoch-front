import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  FLASHCARD_CARDS_URL,
  FLASHCARD_CATEGORIES_URL,
  FLASHCARD_DECKS_URL,
} from '../../manage-labels';

/** Sub-navigation of `/manage/flashcards`: decks, cards, categories. Study is not a tab. */
@Component({
  selector: 'app-flashcard-section',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './flashcard-section.html',
  styleUrl: '../../manage-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardSection {
  protected readonly decksUrl = FLASHCARD_DECKS_URL;
  protected readonly cardsUrl = FLASHCARD_CARDS_URL;
  protected readonly categoriesUrl = FLASHCARD_CATEGORIES_URL;
}
