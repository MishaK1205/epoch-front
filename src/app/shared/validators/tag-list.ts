import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface TagListLimits {
  maxCount: number;
  minLength: number;
  maxLength: number;
}

/**
 * Validates a `string[]` of tags (after trimming each one).
 * Errors: `{ maxTags: { max, actual } }`, `{ tagLength: { min, max, tag } }`.
 */
export function tagListValidator(limits: TagListLimits): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (!Array.isArray(value)) {
      return null;
    }
    if (value.length > limits.maxCount) {
      return { maxTags: { max: limits.maxCount, actual: value.length } };
    }
    const invalid = value.find((tag) => {
      const length = typeof tag === 'string' ? tag.trim().length : 0;
      return length < limits.minLength || length > limits.maxLength;
    });
    return invalid === undefined
      ? null
      : { tagLength: { min: limits.minLength, max: limits.maxLength, tag: invalid } };
  };
}
