import { FlashcardCategory } from '../../../../core/api/flashcards/flashcards.models';
import { flashcardDeckGroup } from './flashcard-deck-rows';

const PARENT = '674f1c2e8b3f4a0012345678';
const CHILD = '674f1c2e8b3f4a0012345679';

function category(overrides: Partial<FlashcardCategory> = {}): FlashcardCategory {
  return {
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
    ...overrides,
  };
}

describe('flashcardDeckGroup', () => {
  it('uses direct counts, subcategory counts and totals without adding them together', () => {
    const group = flashcardDeckGroup(category());

    expect(group.known).toBe(3);
    expect(group.total).toBe(10);
    expect(group.rows.map((row) => [row.kind, row.known, row.total])).toEqual([
      ['direct', 1, 4],
      ['subcategory', 2, 6],
      ['all', 3, 10],
    ]);
    expect(group.rows[2]?.known).toBe(group.known);
    expect(group.rows[2]?.known).not.toBe(1 + 2 + 3);
  });

  it('hides the direct row when it is empty and a subcategory exists', () => {
    const group = flashcardDeckGroup(category({ flashcardCount: 0, knownCount: 0 }));

    expect(group.rows.map((row) => row.kind)).toEqual(['subcategory', 'all']);
  });

  it('keeps the direct row for an empty category with no subcategories', () => {
    const group = flashcardDeckGroup(
      category({
        flashcardCount: 0,
        knownCount: 0,
        totalFlashcardCount: 0,
        totalKnownCount: 0,
        subcategories: [],
      }),
    );

    expect(group.rows.map((row) => row.kind)).toEqual(['direct', 'all']);
    expect(group.rows[0]).toMatchObject({ known: 0, total: 0 });
  });

  it('links direct, subcategory and study-all decks, and preselects a subcategory on new card', () => {
    const group = flashcardDeckGroup(category());
    const [direct, sub, all] = group.rows;

    expect(direct?.studyParams).toEqual({ categoryId: PARENT, direct: true });
    expect(sub?.studyParams).toEqual({ subcategoryId: CHILD });
    expect(sub?.newCardParams).toEqual({ categoryId: PARENT, subcategoryId: CHILD });
    expect(all?.studyParams).toEqual({ categoryId: PARENT });
    expect(all?.studyParams).not.toHaveProperty('direct');
    expect(group.newCardParams).toEqual({ categoryId: PARENT });
  });
});
