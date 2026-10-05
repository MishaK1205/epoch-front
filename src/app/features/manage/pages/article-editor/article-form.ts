import {
  Article,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '../../../../core/api/articles/articles.models';

/** Form state. `''` means "not chosen"; requests send `null` / omit instead (never `''`). */
export interface ArticleFormValue {
  title: string;
  categoryId: string;
  subcategoryId: string;
  coverImageId: string;
  tags: string[];
  content: string;
}

export function toArticleFormValue(article: Article): ArticleFormValue {
  return {
    title: article.title,
    categoryId: article.category?.id ?? '',
    subcategoryId: article.subcategory?.id ?? '',
    coverImageId: article.coverImage?.id ?? '',
    tags: [...article.tags],
    content: article.content,
  };
}

/** Omits `subcategoryId` when none is chosen. */
export function toCreateRequest(value: ArticleFormValue): CreateArticleRequest {
  const body: CreateArticleRequest = {
    title: value.title.trim(),
    content: value.content,
    coverImageId: value.coverImageId,
    categoryId: value.categoryId,
    tags: value.tags,
  };
  if (value.subcategoryId) {
    body.subcategoryId = value.subcategoryId;
  }
  return body;
}

/**
 * Only the fields of `current` that differ from `base` (tags compared order-insensitively).
 * A changed category always comes with `subcategoryId` (the new one or `null`), because the old
 * subcategory doesn't belong to the new category.
 */
export function diffArticleForm(
  base: ArticleFormValue,
  current: ArticleFormValue,
): UpdateArticleRequest {
  const diff: UpdateArticleRequest = {};
  const title = current.title.trim();
  if (title !== base.title) {
    diff.title = title;
  }
  if (current.categoryId !== base.categoryId) {
    diff.categoryId = current.categoryId;
    diff.subcategoryId = current.subcategoryId || null;
  } else if (current.subcategoryId !== base.subcategoryId) {
    diff.subcategoryId = current.subcategoryId || null;
  }
  if (current.coverImageId !== base.coverImageId) {
    diff.coverImageId = current.coverImageId;
  }
  if (!sameTags(current.tags, base.tags)) {
    diff.tags = current.tags;
  }
  if (current.content !== base.content) {
    diff.content = current.content;
  }
  return diff;
}

function sameTags(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedB = [...b].sort();
  return [...a].sort().every((tag, index) => tag === sortedB[index]);
}
