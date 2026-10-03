import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../shared/models/api-error';
import { ClientValidationError } from './client-validation-error';

export const GENERIC_ERROR_MESSAGE = 'რაღაც შეცდომა მოხდა. სცადეთ თავიდან.';
export const NETWORK_ERROR_MESSAGE =
  'სერვერთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ ინტერნეტ კავშირი.';

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const message = candidate['message'];
  return (
    typeof candidate['statusCode'] === 'number' &&
    (typeof message === 'string' ||
      (Array.isArray(message) && message.every((item) => typeof item === 'string')))
  );
}

/** Normalizes any error from an API call into a list of user-facing messages. */
export function getApiErrorMessages(err: unknown): string[] {
  if (err instanceof ClientValidationError) {
    return [err.message];
  }
  if (!(err instanceof HttpErrorResponse)) {
    return [GENERIC_ERROR_MESSAGE];
  }
  if (err.status === 0) {
    return [NETWORK_ERROR_MESSAGE];
  }
  if (isApiError(err.error)) {
    const messages = (Array.isArray(err.error.message) ? err.error.message : [err.error.message])
      .map((message) => message.trim())
      .filter((message) => message.length > 0);
    if (messages.length > 0) {
      return messages;
    }
  }
  return [GENERIC_ERROR_MESSAGE];
}
