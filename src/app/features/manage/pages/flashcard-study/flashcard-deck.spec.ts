import { FlashcardCategory } from '../../../../core/api/flashcards/flashcards.models';
import { findStudyDeck } from './flashcard-deck';

const PARENT = '674f1c2e8b3f4a0012345678';
const CHILD = '674f1c2e8b3f4a0012345679';

const CATEGORIES: FlashcardCategory[] = [
  {
    id: PARENT,
    name: 'ისტორია',
    slug: 'istoria',
    parent: null,
    flashcardCount: 4,
    knownCount: 1,
    totalFlashcardCount: 10,
    totalKnownCount: 3,
    createdAt: '2026-11-04T12:00:00.000Z',
    updatedAt: '2026-11-04T12:00:00.000Z',
    subcategories: [
      {
        id: CHILD,
        name: 'შუა საუკუნეები',
        slug: 'shua-saukuneebi',
        parent: { id: PARENT, name: 'ისტორია', slug: 'istoria' },
        flashcardCount: 6,
        knownCount: 2,
        totalFlashcardCount: 6,
        totalKnownCount: 2,
        createdAt: '2026-11-04T12:00:00.000Z',
        updatedAt: '2026-11-04T12:00:00.000Z',
      },
    ],
  },
];

describe('findStudyDeck', () => {
  it('returns null when the id is not in the tree', () => {
    expect(findStudyDeck(CATEGORIES, { categoryId: 'missing', direct: false })).toBeNull();
    expect(findStudyDeck(CATEGORIES, { subcategoryId: 'missing', direct: false })).toBeNull();
  });

  it('builds the whole-category deck', () => {
    const deck = findStudyDeck(CATEGORIES, { categoryId: PARENT, direct: false });

    expect(deck?.listQuery).toEqual({ categoryId: PARENT });
    expect(deck?.resetBody).toEqual({ categoryId: PARENT });
    expect(deck?.title).toBe('ისტორია');
    expect(deck?.resetsWholeCategory).toBe(true);
  });

  it('builds the direct deck and still resets the whole category', () => {
    const deck = findStudyDeck(CATEGORIES, { categoryId: PARENT, direct: true });

    expect(deck?.listQuery).toEqual({ categoryId: PARENT, direct: true });
    expect(deck?.resetBody).toEqual({ categoryId: PARENT });
    expect(deck?.resetBody).not.toHaveProperty('subcategoryId');
    expect(deck?.kicker).toBe('ბარათები ამ კატეგორიაში');
  });

  it('builds a subcategory deck and prefers subcategoryId over categoryId', () => {
    const deck = findStudyDeck(CATEGORIES, {
      categoryId: PARENT,
      subcategoryId: CHILD,
      direct: true,
    });

    expect(deck?.listQuery).toEqual({ subcategoryId: CHILD });
    expect(deck?.listQuery).not.toHaveProperty('direct');
    expect(deck?.resetBody).toEqual({ subcategoryId: CHILD });
    expect(deck?.title).toBe('შუა საუკუნეები');
    expect(deck?.newCardParams).toEqual({ categoryId: PARENT, subcategoryId: CHILD });
    expect(deck?.resetsWholeCategory).toBe(false);
  });
});
