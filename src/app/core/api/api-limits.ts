/** Validation limits enforced by the server. Use the same values in forms. */
export const API_LIMITS = {
  username: { min: 3, max: 30, pattern: /^[a-zA-Z0-9_.]+$/ },
  email: { max: 254 },
  password: { min: 8, max: 72, pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/ },
  loginIdentifier: { max: 254 },
  categoryName: { min: 2, max: 50 },
  categoryDescription: { max: 500 },
  imageAlt: { max: 200 },
  image: {
    maxSizeBytes: 5 * 1024 * 1024,
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  articleTitle: { min: 3, max: 200 },
  articleContent: { max: 1_000_000 },
  tags: { maxCount: 10, minLength: 1, maxLength: 30 },
  pagination: { defaultLimit: 20, maxLimit: 100 },
  tagsQuery: { defaultLimit: 50, maxLimit: 100 },
  /** `q` of GET /articles and GET /articles/search (after trimming). */
  search: { max: 100 },
  /** "What? Where? When?" packages. Text lengths are after trimming. */
  whatWhereWhen: {
    name: { min: 1, max: 200 },
    authors: { maxCount: 20, minLength: 1, maxLength: 100 },
    date: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
    questions: { maxCount: 100 },
    question: { max: 100_000 },
    answer: { min: 1, max: 1000 },
    comment: { max: 5000 },
    categoryName: { min: 1, max: 100 },
    categoryDescription: { max: 500 },
  },
} as const;
