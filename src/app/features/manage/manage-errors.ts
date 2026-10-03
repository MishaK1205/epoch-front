import { HttpErrorResponse } from '@angular/common/http';
import { getApiErrorMessages } from '../../core/api/api-error-messages';

export const NOT_FOUND_MESSAGE = 'ჩანაწერი ვერ მოიძებნა.';
export const FORBIDDEN_MESSAGE = 'ამ მოქმედების უფლება არ გაქვთ.';

const TRANSLATIONS: Partial<Record<string, string>> = {
  'A category with this name already exists': 'ამ სახელით კატეგორია უკვე არსებობს.',
  'Category name must contain letters or numbers':
    'კატეგორიის სახელი უნდა შეიცავდეს ასოს ან ციფრს.',
  'Category does not exist': 'არჩეული კატეგორია აღარ არსებობს.',
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

const PATTERNS: readonly (readonly [RegExp, (match: RegExpMatchArray) => string])[] = [
  [
    /^Category is used by (\d+) article\(s\)/,
    (match) => `კატეგორია გამოიყენება ${match[1]} სტატიაში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
  ],
  [/^Content references images that do not exist/, () => 'ტექსტში ჩასმული სურათი აღარ არსებობს.'],
];

/** API error → Georgian messages for the management pages (unknown messages are shown as-is). */
export function getManageErrorMessages(err: unknown): string[] {
  const status = err instanceof HttpErrorResponse ? err.status : null;
  const messages = getApiErrorMessages(err).map((message) => translate(message, status));
  return [...new Set(messages)];
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
