import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';
import { getApiErrorMessages } from '../../core/api/api-error-messages';
import { SERVER_ERROR_KEY } from '../../shared/validators/validation-messages';

export const NOT_FOUND_MESSAGE = 'ჩანაწერი ვერ მოიძებნა.';
export const FORBIDDEN_MESSAGE = 'ამ მოქმედების უფლება არ გაქვთ.';

const TRANSLATIONS: Partial<Record<string, string>> = {
  'A category with this name already exists': 'ამ სახელით კატეგორია ან ქვეკატეგორია უკვე არსებობს.',
  'Category name must contain letters or numbers':
    'კატეგორიის სახელი უნდა შეიცავდეს ასოს ან ციფრს.',
  'Parent category does not exist': 'მთავარი კატეგორია აღარ არსებობს. სია განახლდა.',
  'Subcategories cannot have their own subcategories':
    'ქვეკატეგორიას საკუთარი ქვეკატეგორიები ვერ ექნება.',
  'Category does not exist': 'არჩეული კატეგორია აღარ არსებობს.',
  'categoryId must be a top-level category; send the subcategory as subcategoryId':
    'აირჩიეთ მთავარი კატეგორია (ქვეკატეგორია ცალკე ველშია).',
  'Subcategory does not exist': 'არჩეული ქვეკატეგორია აღარ არსებობს.',
  'Subcategory does not belong to the selected category':
    'ქვეკატეგორია არჩეულ კატეგორიას არ ეკუთვნის.',
  'subcategoryId must be a mongodb id': 'ქვეკატეგორიის მნიშვნელობა არასწორია.',
  'Cover image does not exist': 'მთავარი სურათი აღარ არსებობს. ატვირთეთ ხელახლა.',
  'Image is used by an article; remove it from the article first':
    'სურათი გამოიყენება სტატიაში. ჯერ მოაშორეთ ის სტატიას.',
  'You cannot change your own role': 'საკუთარი როლის შეცვლა შეუძლებელია.',
  'You can only modify your own content': 'მხოლოდ საკუთარი სტატიების შეცვლა შეგიძლიათ.',
  'Insufficient permissions': FORBIDDEN_MESSAGE,
  'Article not found': NOT_FOUND_MESSAGE,
  'Category not found': NOT_FOUND_MESSAGE,
  'User not found': NOT_FOUND_MESSAGE,
  'Image not found': NOT_FOUND_MESSAGE,
  'Article content cannot be empty': 'სტატიის ტექსტი ცარიელია.',
  'Images in content must be uploaded via POST /images first (pasted or external images are not allowed)':
    'ტექსტში მხოლოდ ატვირთული სურათები შეიძლება (ჩასმული ან გარე სურათები დაუშვებელია).',
  'Could not generate a unique slug; try a different title':
    'სათაურისთვის უნიკალური ბმული ვერ შეიქმნა. სცადეთ სხვა სათაური.',
  'An article with this slug already exists; please retry':
    'ასეთი ბმულით სტატია უკვე არსებობს. სცადეთ თავიდან.',
};

const SUBCATEGORIES_CONFLICT = /^Category has (\d+) subcategory\(ies\)/;
const ARTICLES_CONFLICT = /^Category is used by (\d+) article\(s\)/;

const PATTERNS: readonly (readonly [RegExp, (match: RegExpMatchArray) => string])[] = [
  [
    ARTICLES_CONFLICT,
    (match) => `კატეგორია გამოიყენება ${match[1]} სტატიაში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
  ],
  [
    SUBCATEGORIES_CONFLICT,
    (match) => `კატეგორიას აქვს ${match[1]} ქვეკატეგორია. ჯერ ისინი წაშალეთ.`,
  ],
  [/^Content references images that do not exist/, () => 'ტექსტში ჩასმული სურათი აღარ არსებობს.'],
];

/** API error → Georgian messages for the management pages (unknown messages are shown as-is). */
export function getManageErrorMessages(err: unknown): string[] {
  return applyManageErrors(err, {}, {});
}

/**
 * Like `getManageErrorMessages`, but backend messages listed in `fieldsByMessage` are shown on
 * those controls (as a `server` error, touched) instead. Returns the remaining messages.
 */
export function applyManageErrors<F extends string>(
  err: unknown,
  fieldsByMessage: Partial<Record<string, F>>,
  controls: Partial<Record<F, AbstractControl>>,
): string[] {
  const status = err instanceof HttpErrorResponse ? err.status : null;
  const rest: string[] = [];
  for (const message of getApiErrorMessages(err)) {
    const translated = translate(message, status);
    const field = fieldsByMessage[message];
    const control = field ? controls[field] : undefined;
    if (control) {
      control.setErrors({ ...control.errors, [SERVER_ERROR_KEY]: translated });
      control.markAsTouched();
    } else {
      rest.push(translated);
    }
  }
  return [...new Set(rest)];
}

/** Which 409 blocked a category delete, if any. */
export function getCategoryDeleteConflict(err: unknown): 'subcategories' | 'articles' | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
    return null;
  }
  const messages = getApiErrorMessages(err);
  if (messages.some((message) => SUBCATEGORIES_CONFLICT.test(message))) {
    return 'subcategories';
  }
  return messages.some((message) => ARTICLES_CONFLICT.test(message)) ? 'articles' : null;
}

function translate(message: string, status: number | null): string {
  const known = TRANSLATIONS[message];
  if (known) {
    return known;
  }
  for (const [pattern, format] of PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return format(match);
    }
  }
  if (status === 404) {
    return NOT_FOUND_MESSAGE;
  }
  if (status === 403) {
    return FORBIDDEN_MESSAGE;
  }
  return message;
}
