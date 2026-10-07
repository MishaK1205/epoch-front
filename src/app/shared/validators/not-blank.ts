import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Fails with `{ blank: true }` when a string value is only whitespace (`''` is left to `required`). */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null;
}
