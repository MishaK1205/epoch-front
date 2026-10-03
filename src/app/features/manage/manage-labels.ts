import { ArticleStatus, Role } from '../../core/api/common.models';
import { BadgeVariant } from '../../shared/ui/badge/badge';

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'დრაფტი',
  published: 'გამოქვეყნებული',
};

export const STATUS_BADGES: Record<ArticleStatus, BadgeVariant> = {
  draft: 'neutral',
  published: 'success',
};

export const ROLE_LABELS: Record<Role, string> = {
  user: 'მომხმარებელი',
  moderator: 'მოდერატორი',
  admin: 'ადმინი',
};

export const ROLE_BADGES: Record<Role, BadgeVariant> = {
  user: 'neutral',
  moderator: 'info',
  admin: 'accent',
};

/** Navigation state flag set by the editor after deleting, so the list can confirm it. */
export const ARTICLE_DELETED_STATE_KEY = 'articleDeleted';

/** Same parsing as the public feed: invalid / missing → page 1. */
export function toPage(value: string | number | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
