import {
  CreateWhatWhereWhenCategoryRequest,
  UpdateWhatWhereWhenCategoryRequest,
  WhatWhereWhenCategory,
} from '../../../../core/api/what-where-when/what-where-when.models';
import { WwwCategoryFormValue } from './www-category-form';

/** Omits an empty description. */
export function toCreateWwwCategoryRequest(
  value: WwwCategoryFormValue,
): CreateWhatWhereWhenCategoryRequest {
  return value.description ? { ...value } : { name: value.name };
}

/** Only the changed fields; `description: ''` clears it. */
export function toUpdateWwwCategoryRequest(
  category: WhatWhereWhenCategory,
  value: WwwCategoryFormValue,
): UpdateWhatWhereWhenCategoryRequest {
  const diff: UpdateWhatWhereWhenCategoryRequest = {};
  if (value.name !== category.name) {
    diff.name = value.name;
  }
  if (value.description !== category.description) {
    diff.description = value.description;
  }
  return diff;
}
