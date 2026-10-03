import { ArticleSummary } from '../articles/articles.models';

/** One entry in the current user's saved or read list. */
export interface ReadingListItem {
  /** Always a published article; same shape as `GET /articles` items (no `content`). */
  article: ArticleSummary;
  /** ISO 8601: when it was saved / marked as read. */
  addedAt: string;
}

/** GET /me/saved-articles and GET /me/read-articles */
export interface ReadingListQuery {
  /** Integer >= 1, default 1. */
  page?: number;
  /** Integer 1–100, default 20. */
  limit?: number;
}
