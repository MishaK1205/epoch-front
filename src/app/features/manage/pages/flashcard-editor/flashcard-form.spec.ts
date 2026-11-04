import { Flashcard } from '../../../../core/api/flashcards/flashcards.models';
import {
  toCreateFlashcardRequest,
  toFlashcardFormValue,
  toUpdateFlashcardRequest,
} from './flashcard-form';

const CARD: Flashcard = {
  id: '674f1c2e8b3f4a0012345680',
  front: '  წელი?  ',
  back: '1121',
  note: 'დიდგორი',
  category: { id: 'cat', name: 'ისტორია', slug: 'istoria' },
  subcategory: { id: 'sub', name: 'შუა საუკუნეები', slug: 'shua' },
  position: 3,
  author: null,
  known: false,
  knownAt: null,
  createdAt: '2026-11-04T12:00:00.000Z',
  updatedAt: '2026-11-04T12:00:00.000Z',
};

const VALUE = toFlashcardFormValue(CARD);

describe('toCreateFlashcardRequest', () => {
  it('omits a blank note, an empty subcategory and position', () => {
    const body = toCreateFlashcardRequest({
      ...VALUE,
      note: '  ',
      subcategoryId: '',
      position: '4',
    });

    expect(body).toEqual({ front: 'წელი?', back: '1121', categoryId: 'cat' });
    expect(body).not.toHaveProperty('note');
    expect(body).not.toHaveProperty('subcategoryId');
    expect(body).not.toHaveProperty('position');
  });

  it('sends a note and a subcategory when they are set', () => {
    expect(toCreateFlashcardRequest(VALUE)).toMatchObject({
      note: 'დიდგორი',
      subcategoryId: 'sub',
    });
    expect(toCreateFlashcardRequest(VALUE)).not.toHaveProperty('position');
  });
});

describe('toUpdateFlashcardRequest', () => {
  it('sends subcategoryId: null when the subcategory is cleared, and note: "" when the note is cleared', () => {
    expect(toUpdateFlashcardRequest(CARD, { ...VALUE, subcategoryId: '', note: '  ' })).toEqual({
      front: 'წელი?',
      back: '1121',
      note: '',
      categoryId: 'cat',
      subcategoryId: null,
    });
  });

  it('sends position only when it changed', () => {
    expect(toUpdateFlashcardRequest(CARD, VALUE)).not.toHaveProperty('position');
    expect(toUpdateFlashcardRequest(CARD, { ...VALUE, position: '9' }).position).toBe(9);
  });

  it('sends the new subcategory in the same request as a new category', () => {
    expect(
      toUpdateFlashcardRequest(CARD, { ...VALUE, categoryId: 'other', subcategoryId: '' }),
    ).toMatchObject({ categoryId: 'other', subcategoryId: null });
  });
});
