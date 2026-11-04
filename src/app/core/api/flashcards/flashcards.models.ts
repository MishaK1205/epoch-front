export type FlashcardStatus = 'known' | 'unknown';

export interface FlashcardCategorySummary {
  id: string;
  name: string;
  slug: string;
}

/** A category or a subcategory. `subcategories` is only on the top-level response. */
export interface FlashcardCategoryBase extends FlashcardCategorySummary {
  description?: string; // omitted when empty
  parent: FlashcardCategorySummary | null; // null for a top-level category
  flashcardCount: number;
  knownCount: number;
  totalFlashcardCount: number;
  totalKnownCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardCategory extends FlashcardCategoryBase {
  subcategories: FlashcardCategoryBase[]; // sorted by name; [] for a subcategory and for a category with none
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  note: string; // '' when empty
  category: FlashcardCategorySummary | null;
  subcategory: FlashcardCategorySummary | null;
  position: number; // lower comes first inside the same category + subcategory
  author: { id: string; username: string } | null;
  known: boolean; // the CURRENT admin
  knownAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardKnowledgeState {
  known: boolean;
  knownAt: string | null;
}

export interface FlashcardProgress {
  total: number;
  known: number;
  unknown: number;
}

export interface ResetFlashcardsResult {
  reset: number;
}

export interface CreateFlashcardCategoryRequest {
  name: string; // 2–50, must contain a letter or digit
  description?: string; // max 500
  parentId?: string; // create only: id of a TOP-LEVEL category → creates a subcategory
}

/** parentId is not allowed. Sending it returns 400 `property parentId should not exist`. */
export type UpdateFlashcardCategoryRequest = Partial<
  Omit<CreateFlashcardCategoryRequest, 'parentId'>
>;

export interface CreateFlashcardRequest {
  front: string; // 1–500
  back: string; // 1–2000
  note?: string; // max 2000; omit to store ''
  categoryId: string; // top-level flashcard category id
  subcategoryId?: string | null; // omit or null = no subcategory
}

export interface UpdateFlashcardRequest extends Partial<CreateFlashcardRequest> {
  position?: number; // integer 0–1_000_000; update only
}

export interface ListFlashcardsQuery {
  page?: number;
  limit?: number;
  category?: string; // category OR subcategory slug
  categoryId?: string; // category OR subcategory id
  subcategoryId?: string;
  direct?: boolean; // with a top-level category: only cards with no subcategory
  status?: FlashcardStatus; // list only; progress ignores it
}

/** POST /flashcards/reset. Send {} to reset every card. */
export interface ResetFlashcardsRequest {
  categoryId?: string; // top-level; includes its subcategories
  subcategoryId?: string; // only that subcategory
}
