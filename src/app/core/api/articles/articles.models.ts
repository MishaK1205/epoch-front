import { CategorySummary } from '../categories/categories.models';
import { ArticleStatus } from '../common.models';
import { ImageSummary } from '../images/images.models';

export interface AuthorSummary {
  id: string;
  username: string;
}

/** Used in article lists. Has NO `content`. */
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  /** Plain text, about 200 characters, may end with '…'. */
  excerpt: string;
  coverImage: ImageSummary | null;
  /** Always a top-level category; `null` if it was deleted. */
  category: CategorySummary | null;
  /** A subcategory of `category`; `null` when the article has none. */
  subcategory: CategorySummary | null;
  /** Lowercase. */
  tags: string[];
  author: AuthorSummary | null;
  status: ArticleStatus;
  /** Null until first published; kept when unpublished. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A single article, with its HTML content. */
export interface Article extends ArticleSummary {
  /** Sanitized HTML from the Quill editor; safe to render with `[innerHTML]`. */
  content: string;
}

/** POST /articles */
export interface CreateArticleRequest {
  /** 3–200 chars. */
  title: string;
  /** Quill HTML, non-empty, max 1,000,000 chars. */
  content: string;
  /** Id of an image uploaded via POST /images. */
  coverImageId: string;
  /** Id of an existing TOP-LEVEL category. */
  categoryId: string;
  /**
   * Id of a subcategory of `categoryId`. Omit or `null` = none; never `''`. On PATCH: omit =
   * keep, `null` = remove. When `categoryId` changes, send this too (the old one won't match).
   */
  subcategoryId?: string | null;
  /** Max 10; each 1–30 chars; lowercased and de-duplicated by the server. */
  tags?: string[];
}

/** PATCH /articles/:id — send only the fields that changed. */
export type UpdateArticleRequest = Partial<CreateArticleRequest>;

/** GET /articles (public list) */
export interface ListArticlesQuery {
  page?: number;
  limit?: number;
  /** Category or subcategory SLUG, max 100. A top-level slug includes its subcategories. */
  category?: string;
  /** Category or subcategory id. */
  categoryId?: string;
  /** Exact tag, case-insensitive, max 30. */
  tag?: string;
  /** Author USERNAME (not id), max 30. */
  author?: string;
  /** Full-text search over title + content, whole words, max 100. */
  q?: string;
}

/** GET /articles/manage */
export interface ManageArticlesQuery {
  page?: number;
  limit?: number;
  status?: ArticleStatus;
  /** Category or subcategory id. */
  categoryId?: string;
}
