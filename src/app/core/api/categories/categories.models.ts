export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

/** A category or a subcategory. */
export interface CategoryBase extends CategorySummary {
  /** Omitted when empty. */
  description?: string;
  /** Set for subcategories; `null` for top-level categories. */
  parent: CategorySummary | null;
  /**
   * Number of PUBLISHED articles. A top-level count includes its subcategories' articles.
   */
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * What `GET /categories`, `GET /categories/:slug`, `POST` and `PATCH` return. Subcategories are
 * one level deep: `subcategories` is always `[]` for a subcategory.
 */
export interface Category extends CategoryBase {
  /** Sorted by name. */
  subcategories: CategoryBase[];
}

/** POST /categories */
export interface CreateCategoryRequest {
  /**
   * 2–50 chars; must contain at least one letter or digit. Unique across all categories and
   * subcategories.
   */
  name: string;
  /** Max 500. */
  description?: string;
  /** Id of a TOP-LEVEL category: creates a subcategory of it. Omit for a top-level category. */
  parentId?: string;
}

/** PATCH /categories/:id — the parent can never change (`parentId` is rejected with 400). */
export type UpdateCategoryRequest = Partial<Omit<CreateCategoryRequest, 'parentId'>>;
