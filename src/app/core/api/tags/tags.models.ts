export interface Tag {
  name: string;
  /** Number of published articles with this tag. */
  count: number;
}

/** GET /tags */
export interface ListTagsQuery {
  /** Tag prefix for autocomplete, max 30. */
  q?: string;
  /** 1–100, default 50. */
  limit?: number;
}
