import {
  CreateQuizCategoryRequest,
  QuizCategoryBase,
  UpdateQuizCategoryRequest,
} from '../../../../core/api/quizzes/quizzes.models';
import { QuizCategoryFormValue } from './quiz-category-form';

/** Omits an empty description. Adds `parentId` only when creating a subcategory. */
export function toCreateQuizCategoryRequest(
  value: QuizCategoryFormValue,
): CreateQuizCategoryRequest {
  const body: CreateQuizCategoryRequest = { name: value.name };
  if (value.description) {
    body.description = value.description;
  }
  if (value.parentId) {
    body.parentId = value.parentId;
  }
  return body;
}

/** Only the changed name / description. Never contains `parentId`. */
export function toUpdateQuizCategoryRequest(
  category: QuizCategoryBase,
  value: QuizCategoryFormValue,
): UpdateQuizCategoryRequest {
  const diff: UpdateQuizCategoryRequest = {};
  if (value.name !== category.name) {
    diff.name = value.name;
  }
  if (value.description !== (category.description ?? '')) {
    diff.description = value.description;
  }
  return diff;
}
