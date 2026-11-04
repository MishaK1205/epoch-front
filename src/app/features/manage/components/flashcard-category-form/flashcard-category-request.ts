import {
  CreateFlashcardCategoryRequest,
  FlashcardCategoryBase,
  UpdateFlashcardCategoryRequest,
} from '../../../../core/api/flashcards/flashcards.models';
import { FlashcardCategoryFormValue } from './flashcard-category-form';

/** Omits an empty description. Adds `parentId` only when creating a subcategory. */
export function toCreateFlashcardCategoryRequest(
  value: FlashcardCategoryFormValue,
): CreateFlashcardCategoryRequest {
  const body: CreateFlashcardCategoryRequest = { name: value.name };
  if (value.description) {
    body.description = value.description;
  }
  if (value.parentId) {
    body.parentId = value.parentId;
  }
  return body;
}

/** Only the changed name / description. Never contains `parentId`. */
export function toUpdateFlashcardCategoryRequest(
  category: FlashcardCategoryBase,
  value: FlashcardCategoryFormValue,
): UpdateFlashcardCategoryRequest {
  const diff: UpdateFlashcardCategoryRequest = {};
  if (value.name !== category.name) {
    diff.name = value.name;
  }
  if (value.description !== (category.description ?? '')) {
    diff.description = value.description;
  }
  return diff;
}
