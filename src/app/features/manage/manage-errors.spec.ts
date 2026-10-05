import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR_MESSAGE } from '../../core/api/api-error-messages';
import { FormControl } from '@angular/forms';
import {
  applyManageErrors,
  FORBIDDEN_MESSAGE,
  getCategoryDeleteConflict,
  getManageErrorMessages,
  NOT_FOUND_MESSAGE,
} from './manage-errors';

function httpError(status: number, message: string | string[]): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, message } });
}

describe('getManageErrorMessages', () => {
  it('translates the category-in-use conflict with the article count', () => {
    const err = httpError(409, 'Category is used by 3 article(s); move or delete them first');

    expect(getManageErrorMessages(err)).toEqual([
      'კატეგორია გამოიყენება 3 სტატიაში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.',
    ]);
  });

  it('translates the image-in-use conflict and the own-role 403', () => {
    expect(
      getManageErrorMessages(
        httpError(409, 'Image is used by an article; remove it from the article first'),
      ),
    ).toEqual(['სურათი გამოიყენება სტატიაში. ჯერ მოაშორეთ ის სტატიას.']);
    expect(getManageErrorMessages(httpError(403, 'You cannot change your own role'))).toEqual([
      'საკუთარი როლის შეცვლა შეუძლებელია.',
    ]);
  });

  it('falls back to generic 404 / 403 messages for unknown texts', () => {
    expect(getManageErrorMessages(httpError(404, 'Something not found'))).toEqual([
      NOT_FOUND_MESSAGE,
    ]);
    expect(getManageErrorMessages(httpError(403, 'Forbidden resource'))).toEqual([
      FORBIDDEN_MESSAGE,
    ]);
  });

  it('keeps unknown validation messages and de-duplicates translations', () => {
    const err = httpError(400, ['title must be longer', 'Article not found', 'User not found']);

    expect(getManageErrorMessages(err)).toEqual(['title must be longer', NOT_FOUND_MESSAGE]);
  });

  it('translates the subcategories conflict and tells the two delete conflicts apart', () => {
    const subcategories = httpError(409, 'Category has 2 subcategory(ies); delete them first');
    const articles = httpError(409, 'Category is used by 1 article(s); move or delete them first');

    expect(getManageErrorMessages(subcategories)).toEqual([
      'კატეგორიას აქვს 2 ქვეკატეგორია. ჯერ ისინი წაშალეთ.',
    ]);
    expect(getCategoryDeleteConflict(subcategories)).toBe('subcategories');
    expect(getCategoryDeleteConflict(articles)).toBe('articles');
    expect(getCategoryDeleteConflict(httpError(400, 'Bad'))).toBeNull();
  });

  it('puts mapped messages on form controls and returns the rest', () => {
    const name = new FormControl('History');
    const err = httpError(409, ['A category with this name already exists', 'Other problem']);

    const rest = applyManageErrors(
      err,
      { 'A category with this name already exists': 'name' },
      {
        name,
      },
    );

    expect(rest).toEqual(['Other problem']);
    expect(name.errors).toEqual({ server: 'ამ სახელით კატეგორია ან ქვეკატეგორია უკვე არსებობს.' });
    expect(name.touched).toBe(true);
  });

  it('uses the generic message for non-HTTP errors', () => {
    expect(getManageErrorMessages(new Error('boom'))).toEqual([GENERIC_ERROR_MESSAGE]);
  });
});
