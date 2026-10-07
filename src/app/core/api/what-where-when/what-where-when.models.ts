/** One question of a package, as returned by the API. */
export interface WhatWhereWhenQuestion {
  /** Sanitized Quill HTML (may contain `<img>`). */
  question: string;
  /** Plain text; render with interpolation, never `innerHTML`. */
  answer: string;
  /** Plain text; `''` when there is no comment. */
  comment: string;
}

/**
 * GET /what-where-when-categories. Flat (no subcategories, no slug); not the article `Category`.
 */
export interface WhatWhereWhenCategory {
  id: string;
  /** Unique, case-insensitive. */
  name: string;
  /** `''` when there is none. */
  description: string;
  /** How many packages are in this category. */
  packageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The category as embedded in a package (always the current name). */
export interface WhatWhereWhenCategorySummary {
  id: string;
  name: string;
}

/** POST /what-where-when-categories */
export interface CreateWhatWhereWhenCategoryRequest {
  /** 1–100 chars after trimming; unique, case-insensitive. */
  name: string;
  /** Max 500; omit for none. */
  description?: string;
}

/** PATCH /what-where-when-categories/:id. Send only what changed; `''` clears the description. */
export type UpdateWhatWhereWhenCategoryRequest = Partial<CreateWhatWhereWhenCategoryRequest>;

/** A package in the list (GET /what-where-when). No questions, only their count. */
export interface WhatWhereWhenSummary {
  id: string;
  name: string;
  /** Free-text names, not user accounts. */
  authors: string[];
  /** `null` = no category. */
  category: WhatWhereWhenCategorySummary | null;
  /** Calendar date `YYYY-MM-DD` (no time zone). */
  date: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A full package (GET /what-where-when/:id, POST, PATCH). */
export interface WhatWhereWhenPackage extends WhatWhereWhenSummary {
  /** In the order they are asked: index 0 = question 1. */
  questions: WhatWhereWhenQuestion[];
}

/** One question in a create/update body. */
export interface WhatWhereWhenQuestionRequest {
  /** Quill HTML, non-empty, max 100,000 chars. Images must come from POST /images. */
  question: string;
  /** 1–1000 chars after trimming. */
  answer: string;
  /** Max 5000 chars; omit (or `''`) for no comment. */
  comment?: string;
}

/** POST /what-where-when */
export interface CreateWhatWhereWhenRequest {
  /** 1–200 chars after trimming. */
  name: string;
  /** Max 20; each 1–100 chars; the server trims and removes empty / duplicate names. */
  authors?: string[];
  /** `YYYY-MM-DD`, must be a real calendar date. */
  date: string;
  /** A `WhatWhereWhenCategory` id; omitted or `null` = no category. */
  categoryId?: string | null;
  /** Max 100; omitted = no questions. */
  questions?: WhatWhereWhenQuestionRequest[];
}

/**
 * PATCH /what-where-when/:id. Send only what changed; `questions` replaces the WHOLE list.
 * `categoryId`: omitted = keep, `null` = remove, id = set.
 */
export type UpdateWhatWhereWhenRequest = Partial<CreateWhatWhereWhenRequest>;

/** GET /what-where-when */
export interface ListWhatWhereWhenQuery {
  /** Integer >= 1, default 1. */
  page?: number;
  /** Integer 1–100, default 20. */
  limit?: number;
  /** Only packages in this category; an unknown (well-formed) id returns an empty page. */
  categoryId?: string;
}
