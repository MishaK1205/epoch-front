import { HttpErrorResponse } from '@angular/common/http';
import {
  GENERIC_ERROR_MESSAGE,
  getApiErrorMessages,
  NETWORK_ERROR_MESSAGE,
} from './api-error-messages';
import { ClientValidationError } from './client-validation-error';

describe('getApiErrorMessages', () => {
  it('normalizes an array message', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: ['a', 'b'], error: 'Bad Request' },
    });
    expect(getApiErrorMessages(err)).toEqual(['a', 'b']);
  });

  it('wraps a string message', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { statusCode: 409, message: 'Username is already taken', error: 'Conflict' },
    });
    expect(getApiErrorMessages(err)).toEqual(['Username is already taken']);
  });

  it('handles network errors', () => {
    expect(getApiErrorMessages(new HttpErrorResponse({ status: 0 }))).toEqual([
      NETWORK_ERROR_MESSAGE,
    ]);
  });

  it('returns client validation messages', () => {
    expect(getApiErrorMessages(new ClientValidationError('Too big'))).toEqual(['Too big']);
  });

  it('falls back to a generic message', () => {
    expect(getApiErrorMessages(new HttpErrorResponse({ status: 500, error: 'oops' }))).toEqual([
      GENERIC_ERROR_MESSAGE,
    ]);
    expect(getApiErrorMessages('anything')).toEqual([GENERIC_ERROR_MESSAGE]);
  });
});
