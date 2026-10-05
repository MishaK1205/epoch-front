import { ValidationErrors } from '@angular/forms';

/** Custom messages per validator key, e.g. `{ pattern: 'Only letters and digits' }`. */
export type ValidationMessageOverrides = Partial<Record<string, string>>;

/** Error key for a server message shown on a field: `control.setErrors({ server: 'text' })`. */
export const SERVER_ERROR_KEY = 'server';

/** Returns a user-facing (Georgian) message for the first error in `errors`. */
export function getValidationMessage(
  errors: ValidationErrors | null,
  overrides: ValidationMessageOverrides = {},
): string | null {
  if (!errors) {
    return null;
  }
  const key = Object.keys(errors)[0];
  if (key === undefined) {
    return null;
  }
  const override = overrides[key];
  if (override) {
    return override;
  }
  const details: unknown = errors[key];
  switch (key) {
    case 'required':
      return 'ველი სავალდებულოა.';
    case 'email':
      return 'შეიყვანეთ სწორი ელ-ფოსტა.';
    case 'minlength':
      return `მინიმუმ ${readNumber(details, 'requiredLength')} სიმბოლო.`;
    case 'maxlength':
      return `მაქსიმუმ ${readNumber(details, 'requiredLength')} სიმბოლო.`;
    case 'pattern':
      return 'არასწორი ფორმატი.';
    case 'mismatch':
      return 'მნიშვნელობები არ ემთხვევა.';
    case SERVER_ERROR_KEY:
      return typeof details === 'string' ? details : 'არასწორი მნიშვნელობა.';
    default:
      return 'არასწორი მნიშვნელობა.';
  }
}

function readNumber(details: unknown, property: string): number | string {
  if (typeof details === 'object' && details !== null && property in details) {
    const value: unknown = (details as Record<string, unknown>)[property];
    if (typeof value === 'number') {
      return value;
    }
  }
  return '';
}
