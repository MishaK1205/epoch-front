import { FlashcardCategoryBase } from '../../../../core/api/flashcards/flashcards.models';
import {
  toCreateFlashcardCategoryRequest,
  toUpdateFlashcardCategoryRequest,
} from './flashcard-category-request';

const CATEGORY: FlashcardCategoryBase = {
  id: '674f1c2e8b3f4a0012345678',
  name: 'History',
  slug: 'history',
  description: 'Facts',
  parent: null,
  flashcardCount: 0,
  knownCount: 0,
  totalFlashcardCount: 0,
  totalKnownCount: 0,
  createdAt: '2026-11-04T12:00:00.000Z',
  updatedAt: '2026-11-04T12:00:00.000Z',
};

describe('toCreateFlashcardCategoryRequest', () => {
  it('omits an empty description and an empty parentId', () => {
    expect(
      toCreateFlashcardCategoryRequest({ name: 'History', description: '', parentId: '' }),
    ).toEqual({
      name: 'History',
    });
  });

  it('sends parentId when creating a subcategory', () => {
    expect(
      toCreateFlashcardCategoryRequest({
        name: 'History',
        description: 'Facts',
        parentId: 'abc',
      }),
    ).toEqual({ name: 'History', description: 'Facts', parentId: 'abc' });
  });
});

describe('toUpdateFlashcardCategoryRequest', () => {
  it('sends only changed fields and never parentId; an empty description clears it', () => {
    expect(
      toUpdateFlashcardCategoryRequest(CATEGORY, {
        name: 'History',
        description: '',
        parentId: 'abc',
      }),
    ).toEqual({ description: '' });
    expect(
      toUpdateFlashcardCategoryRequest(CATEGORY, {
        name: 'Art',
        description: 'Facts',
        parentId: 'abc',
      }),
    ).toEqual({ name: 'Art' });
    expect(
      toUpdateFlashcardCategoryRequest(CATEGORY, {
        name: 'History',
        description: 'Facts',
        parentId: 'should-not-be-sent',
      }),
    ).toEqual({});
  });
});
