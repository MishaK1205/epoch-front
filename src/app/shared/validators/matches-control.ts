import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Fails with `{ mismatch: true }` when the value differs from the sibling control `otherName`.
 * Re-run it (`updateValueAndValidity()`) when the sibling changes.
 */
export function matchesControl(otherName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const other = control.parent?.get(otherName);
    if (!other || !control.value) {
      return null;
    }
    return control.value === other.value ? null : { mismatch: true };
  };
}
