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

/** Navigation state flags for "What? Where? When?" packages (set after create / delete). */
export const WWW_PACKAGE_CREATED_STATE_KEY = 'wwwPackageCreated';
export const WWW_PACKAGE_DELETED_STATE_KEY = 'wwwPackageDeleted';

export const WWW_PACKAGES_URL = '/manage/what-where-when';
export const WWW_CATEGORIES_URL = '/manage/what-where-when/categories';

export const FLASHCARD_DECKS_URL = '/manage/flashcards';
export const FLASHCARD_CARDS_URL = '/manage/flashcards/cards';
export const FLASHCARD_CATEGORIES_URL = '/manage/flashcards/categories';

export const QUIZZES_URL = '/manage/quizzes';
export const QUIZ_CATEGORIES_URL = '/manage/quizzes/categories';
/** The play page outside `/manage`. */
export const QUIZ_PLAY_URL = '/quizzes';

/** Navigation state flags for quizzes (set after create / delete). */
export const QUIZ_CREATED_STATE_KEY = 'quizCreated';
export const QUIZ_DELETED_STATE_KEY = 'quizDeleted';

/** Confirm-dialog text for deleting a quiz (its results go too). */
export function quizDeleteMessage(title: string): string {
  return `„${title}“ სამუდამოდ წაიშლება ყველა შედეგთან ერთად. ამ მოქმედების გაუქმება შეუძლებელია. სურათები დარჩება.`;
}

/** Navigation state flag set after creating a card, so the list can confirm it. */
export const FLASHCARD_CREATED_STATE_KEY = 'flashcardCreated';

/** Success text for `POST /flashcards/reset`. `0` is a successful no-op. */
export function flashcardsResetMessage(count: number): string {
  return `განულდა ${count} ბარათი.`;
}

/** Confirm-dialog text for deleting a card (it is removed for every admin). */
export function flashcardDeleteMessage(front: string): string {
  const preview = front.length > 80 ? `${front.slice(0, 80)}…` : front;
  return `„${preview}“ სამუდამოდ წაიშლება ყველა ადმინისთვის. ამ მოქმედების გაუქმება შეუძლებელია.`;
}

/** Confirm-dialog text for deleting a package (list and view pages). */
export function wwwPackageDeleteMessage(name: string): string {
  return `„${name}“ სამუდამოდ წაიშლება. ამ მოქმედების გაუქმება შეუძლებელია. მასში გამოყენებული სურათები დარჩება.`;
}
/** Same parsing as the public feed: invalid / missing → page 1. */
export function toPage(value: string | number | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
