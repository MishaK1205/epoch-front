import { FlashcardCategory } from '../../../../core/api/flashcards/flashcards.models';

export type FlashcardDeckRowKind = 'direct' | 'subcategory' | 'all';

/** Query params for `/manage/flashcards/study` or the editor. `direct` is only ever `true`. */
export interface FlashcardDeckParams {
  categoryId?: string;
  subcategoryId?: string;
  direct?: true;
}

export interface FlashcardDeckRow {
  id: string;
  kind: FlashcardDeckRowKind;
  /** Subcategory name. Empty for the direct and study-all rows. */
  name: string;
  /** Direct cards, or that subcategory, or the category totals. Never a sum of both. */
  known: number;
  total: number;
  studyParams: FlashcardDeckParams;
  /** Set on subcategory rows so "new card" preselects that subcategory. */
  newCardParams: FlashcardDeckParams | null;
}

export interface FlashcardDeckGroup {
  category: FlashcardCategory;
  /** `totalKnownCount` / `totalFlashcardCount` — already includes subcategories. */
  known: number;
  total: number;
  newCardParams: FlashcardDeckParams;
  rows: FlashcardDeckRow[];
}

/**
 * One top-level category as decks. Direct counts are only cards with no subcategory.
 * The study-all row uses the category totals, which already include subcategories.
 */
export function flashcardDeckGroup(category: FlashcardCategory): FlashcardDeckGroup {
  const rows: FlashcardDeckRow[] = [];
  if (category.flashcardCount > 0 || category.subcategories.length === 0) {
    rows.push({
      id: `${category.id}:direct`,
      kind: 'direct',
      name: '',
      known: category.knownCount,
      total: category.flashcardCount,
      studyParams: { categoryId: category.id, direct: true },
      newCardParams: null,
    });
  }
  for (const subcategory of category.subcategories) {
    rows.push({
      id: subcategory.id,
      kind: 'subcategory',
      name: subcategory.name,
      known: subcategory.knownCount,
      total: subcategory.flashcardCount,
      studyParams: { subcategoryId: subcategory.id },
      newCardParams: { categoryId: category.id, subcategoryId: subcategory.id },
    });
  }
  rows.push({
    id: `${category.id}:all`,
    kind: 'all',
    name: '',
    known: category.totalKnownCount,
    total: category.totalFlashcardCount,
    studyParams: { categoryId: category.id },
    newCardParams: null,
  });
  return {
    category,
    known: category.totalKnownCount,
    total: category.totalFlashcardCount,
    newCardParams: { categoryId: category.id },
    rows,
  };
}
