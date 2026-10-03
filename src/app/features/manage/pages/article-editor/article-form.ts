import {
  Article,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '../../../../core/api/articles/articles.models';

export interface ArticleFormValue {
  title: string;
  categoryId: string;
  coverImageId: string;
  tags: string[];
  content: string;
}

export function toArticleFormValue(article: Article): ArticleFormValue {
  return {
    title: article.title,
    categoryId: article.category?.id ?? '',
    coverImageId: article.coverImage?.id ?? '',
    tags: [...article.tags],
    content: article.content,
  };
}

export function toCreateRequest(value: ArticleFormValue): CreateArticleRequest {
  return { ...value, title: value.title.trim() };
}

/** Only the fields of `current` that differ from `base` (tags compared order-insensitively). */
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
