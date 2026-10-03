export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /** Number of PUBLISHED articles in this category. */
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

/** POST /categories */
export interface CreateCategoryRequest {
  /** 2–50 chars; must contain at least one letter or digit. */
  name: string;
  /** Max 500. */
  description?: string;
}

/** PATCH /categories/:id */
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;
