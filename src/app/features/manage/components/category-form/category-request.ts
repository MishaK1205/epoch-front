import {
  CategoryBase,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../../../core/api/categories/categories.models';
import { CategoryFormValue } from './category-form';

/** Omits an empty description and an empty `parentId` ("None" = top-level category). */
export function toCreateCategoryRequest(value: CategoryFormValue): CreateCategoryRequest {
  const body: CreateCategoryRequest = { name: value.name };
  if (value.description) {
    body.description = value.description;
  }
  if (value.parentId) {
    body.parentId = value.parentId;
  }
  return body;
}

/** Only the changed name / description. Never contains `parentId` (the server rejects it). */
export function toUpdateCategoryRequest(
  category: CategoryBase,
  value: CategoryFormValue,
): UpdateCategoryRequest {
  const diff: UpdateCategoryRequest = {};
  if (value.name !== category.name) {
    diff.name = value.name;
  }
  if (value.description !== (category.description ?? '')) {
    diff.description = value.description;
  }
  return diff;
}
