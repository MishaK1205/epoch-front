import { AbstractControl, ValidationErrors } from '@angular/forms';
import { parseLocalDate } from '../utils/local-date';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fails with `{ realDate: true }` for a well-formed `YYYY-MM-DD` that isn't a calendar date
 * (`2026-02-30`). Empty values and other formats are left to `required` / `pattern`.
 */
export function realDate(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return null;
  }
  return parseLocalDate(value) ? null : { realDate: true };
}
