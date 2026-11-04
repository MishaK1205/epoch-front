import {
  Flashcard,
  UpdateFlashcardRequest,
} from '../../../../core/api/flashcards/flashcards.models';
import { CreateFlashcardRequest } from '../../../../core/api/flashcards/flashcards.models';

/** Form state. `''` means "not chosen"; requests omit the field or send `null`. */
export interface FlashcardFormValue {
  front: string;
  back: string;
  note: string;
  categoryId: string;
  subcategoryId: string;
  /** Edit only. A string so the number input can be empty while the admin is typing. */
  position: string;
}

export function toFlashcardFormValue(card: Flashcard): FlashcardFormValue {
  return {
    front: card.front,
    back: card.back,
    note: card.note,
    categoryId: card.category?.id ?? '',
    subcategoryId: card.subcategory?.id ?? '',
    position: String(card.position),
  };
}

/** Omits a blank note, an empty subcategory and `position` (the server appends the card). */
export function toCreateFlashcardRequest(value: FlashcardFormValue): CreateFlashcardRequest {
  const body: CreateFlashcardRequest = {
    front: value.front.trim(),
    back: value.back.trim(),
    categoryId: value.categoryId,
  };
  const note = value.note.trim();
  if (note) {
    body.note = note;
  }
  if (value.subcategoryId) {
    body.subcategoryId = value.subcategoryId;
  }
  return body;
}

/**
 * Sends the text and the category every time. `subcategoryId: null` clears it.
 * `position` is included only when the admin changed it.
 */
export function toUpdateFlashcardRequest(
  card: Flashcard,
  value: FlashcardFormValue,
): UpdateFlashcardRequest {
  const body: UpdateFlashcardRequest = {
    front: value.front.trim(),
    back: value.back.trim(),
    note: value.note.trim(),
    categoryId: value.categoryId,
    subcategoryId: value.subcategoryId || null,
  };
  if (/^\d+$/.test(value.position)) {
    const position = Number(value.position);
    if (position !== card.position) {
      body.position = position;
    }
  }
  return body;
}
