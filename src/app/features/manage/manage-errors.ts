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
  'coverImageId must be a mongodb id': 'მთავარი სურათის მნიშვნელობა არასწორია.',
  'Username is already taken': 'ეს მომხმარებლის სახელი უკვე დაკავებულია.',
  'Email is already registered': 'ეს ელ-ფოსტა უკვე დარეგისტრირებულია.',
  'Username and email are already taken': 'მომხმარებლის სახელი და ელ-ფოსტა უკვე დაკავებულია.',
  'Image is used by an article; remove it from the article first':
    'სურათი გამოიყენება სტატიაში. ჯერ მოაშორეთ ის სტატიას.',
  'Image is used by a What? Where? When? package; remove it from the package first':
    'სურათი გამოიყენება „რა? სად? როდის?“ პაკეტში. ჯერ მოაშორეთ ის პაკეტს.',
  'What? Where? When? package not found': 'პაკეტი ვერ მოიძებნა.',
  'What? Where? When? category not found': 'კატეგორია ვერ მოიძებნა.',
  'A What? Where? When? category with this name already exists':
    'ამ სახელით კატეგორია უკვე არსებობს (დიდ და პატარა ასოებს არ აქვს მნიშვნელობა).',
  'A flashcard category with this name already exists':
    'ამ სახელით ფლეშბარათის კატეგორია უკვე არსებობს (დიდ და პატარა ასოებს არ აქვს მნიშვნელობა).',
  'Flashcard category name must contain letters or numbers': 'სახელი უნდა შეიცავდეს ასოს ან ციფრს.',
  'Parent flashcard category does not exist': 'მთავარი კატეგორია აღარ არსებობს. სია განახლდა.',
  'Flashcard category does not exist': 'არჩეული კატეგორია აღარ არსებობს.',
  'categoryId must be a top-level flashcard category; send the subcategory as subcategoryId':
    'აირჩიეთ მთავარი კატეგორია (ქვეკატეგორია ცალკე ველშია).',
  'Flashcard subcategory does not exist': 'არჩეული ქვეკატეგორია აღარ არსებობს.',
  'Subcategory does not belong to the selected flashcard category':
    'ქვეკატეგორია არჩეულ კატეგორიას არ ეკუთვნის.',
  'Flashcard category not found': 'ფლეშბარათის კატეგორია ვერ მოიძებნა.',
  'Flashcard not found': 'ფლეშბარათი ვერ მოიძებნა.',
  'A quiz category with this name already exists':
    'ამ სახელით ქვიზის კატეგორია უკვე არსებობს (დიდ და პატარა ასოებს არ აქვს მნიშვნელობა).',
  'Quiz category name must contain letters or numbers': 'სახელი უნდა შეიცავდეს ასოს ან ციფრს.',
  'Parent quiz category does not exist': 'მთავარი კატეგორია აღარ არსებობს. სია განახლდა.',
  'Quiz category does not exist': 'არჩეული კატეგორია აღარ არსებობს.',
  'categoryId must be a top-level quiz category; send the subcategory as subcategoryId':
    'აირჩიეთ მთავარი კატეგორია (ქვეკატეგორია ცალკე ველშია).',
  'Quiz subcategory does not exist': 'არჩეული ქვეკატეგორია აღარ არსებობს.',
  'Subcategory does not belong to the selected quiz category':
    'ქვეკატეგორია არჩეულ კატეგორიას არ ეკუთვნის.',
  'Quiz category not found': 'ქვიზის კატეგორია ვერ მოიძებნა.',
  'Quiz not found': 'ქვიზი ვერ მოიძებნა.',
  'Quiz has no questions yet': 'ქვიზში კითხვები ჯერ არ არის.',
  'Image is used by a quiz; remove it from the quiz first':
    'სურათი გამოიყენება ქვიზში. ჯერ მოაშორეთ ის ქვიზს.',
  'title must be longer than or equal to 1 characters': 'სათაური სავალდებულოა.',
  'title must be shorter than or equal to 200 characters':
    'სათაური უნდა იყოს მაქსიმუმ 200 სიმბოლო.',
  'description must be shorter than or equal to 2000 characters':
    'აღწერა უნდა იყოს მაქსიმუმ 2000 სიმბოლო.',
  'property parentId should not exist': 'მშობელი კატეგორიის შეცვლა შეუძლებელია.',
  'front must be longer than or equal to 1 characters': 'წინა მხარე სავალდებულოა.',
  'back must be longer than or equal to 1 characters': 'ფაქტი სავალდებულოა.',
  'front must be shorter than or equal to 500 characters':
    'წინა მხარე უნდა იყოს მაქსიმუმ 500 სიმბოლო.',
  'back must be shorter than or equal to 2000 characters': 'ფაქტი უნდა იყოს მაქსიმუმ 2000 სიმბოლო.',
  'note must be shorter than or equal to 2000 characters':
    'შენიშვნა უნდა იყოს მაქსიმუმ 2000 სიმბოლო.',
  'name must be longer than or equal to 2 characters': 'სახელი უნდა იყოს მინიმუმ 2 სიმბოლო.',
  'name must be shorter than or equal to 50 characters': 'სახელი უნდა იყოს მაქსიმუმ 50 სიმბოლო.',
  'direct requires category or categoryId of a top-level flashcard category':
    'პირდაპირი ფილტრი მხოლოდ მთავარ კატეგორიასთან მუშაობს.',
  'direct only applies to a top-level flashcard category':
    'პირდაპირი ფილტრი ქვეკატეგორიაზე არ ვრცელდება.',
  'direct cannot be combined with subcategoryId':
    'პირდაპირი ფილტრი და ქვეკატეგორია ერთად ვერ გამოიყენება.',
  'position must be an integer number': 'რიგითობა მთელი რიცხვი უნდა იყოს.',
  'position must not be less than 0': 'რიგითობა მინიმუმ 0 უნდა იყოს.',
  'position must not be greater than 1000000': 'რიგითობა მაქსიმუმ 1 000 000 უნდა იყოს.',
  'categoryId must be a mongodb id': 'კატეგორიის მნიშვნელობა არასწორია.',
  'name must be shorter than or equal to 100 characters': 'სახელი უნდა იყოს მაქსიმუმ 100 სიმბოლო.',
  'description must be shorter than or equal to 500 characters':
    'აღწერა უნდა იყოს მაქსიმუმ 500 სიმბოლო.',
  'date must be YYYY-MM-DD': 'თარიღი უნდა იყოს ფორმატით წწწწ-თთ-დდ.',
  'date must be a valid date': 'ასეთი თარიღი არ არსებობს.',
  'name must be longer than or equal to 1 characters': 'სახელი სავალდებულოა.',
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
const PACKAGES_CONFLICT = /^Category is used by (\d+) package\(s\)/;
const FLASHCARD_SUBCATEGORIES_CONFLICT =
  /^Flashcard category has (\d+) subcategory\(ies\); delete them first$/;
const FLASHCARD_CARDS_CONFLICT =
  /^Flashcard category is used by (\d+) flashcard\(s\); move or delete them first$/;

const QUIZ_CATEGORY_SUBCATEGORIES_CONFLICT =
  /^Quiz category has (\d+) subcategory\(ies\); delete them first$/;
const QUIZ_CATEGORY_QUIZZES_CONFLICT =
  /^Quiz category is used by (\d+) quiz\(zes\); move or delete them first$/;

const PATTERNS: readonly (readonly [RegExp, (match: RegExpMatchArray) => string])[] = [
  [
    PACKAGES_CONFLICT,
    (match) => `კატეგორიაში ${match[1]} პაკეტია. ჯერ გადაიტანეთ ისინი სხვა კატეგორიაში.`,
  ],
  [
    ARTICLES_CONFLICT,
    (match) => `კატეგორია გამოიყენება ${match[1]} სტატიაში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
  ],
  [
    SUBCATEGORIES_CONFLICT,
    (match) => `კატეგორიას აქვს ${match[1]} ქვეკატეგორია. ჯერ ისინი წაშალეთ.`,
  ],
  [
    FLASHCARD_SUBCATEGORIES_CONFLICT,
    (match) => `კატეგორიას აქვს ${match[1]} ქვეკატეგორია. ჯერ ისინი წაშალეთ.`,
  ],
  [
    FLASHCARD_CARDS_CONFLICT,
    (match) => `კატეგორია გამოიყენება ${match[1]} ფლეშბარათში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
  ],
  [
    QUIZ_CATEGORY_SUBCATEGORIES_CONFLICT,
    (match) => `კატეგორიას აქვს ${match[1]} ქვეკატეგორია. ჯერ ისინი წაშალეთ.`,
  ],
  [
    QUIZ_CATEGORY_QUIZZES_CONFLICT,
    (match) => `კატეგორია გამოიყენება ${match[1]} ქვიზში. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
  ],
  [
    /^Question (\d+) options must all be different$/,
    (match) => `კითხვა ${match[1]}: ოთხივე პასუხი განსხვავებული უნდა იყოს.`,
  ],
  [
    /^Question (\d+) image does not exist$/,
    (match) => `კითხვა ${match[1]}: სურათი აღარ არსებობს. ატვირთეთ ხელახლა.`,
  ],
  [
    /^Question (\d+) has an id that is not in this quiz/,
    (match) => `კითხვა ${match[1]} ამ ქვიზს აღარ ეკუთვნის. გადატვირთეთ გვერდი.`,
  ],
  [
    /^Question (\d+) repeats the id of another question$/,
    (match) => `კითხვა ${match[1]} სხვა კითხვის ასლია. გადატვირთეთ გვერდი.`,
  ],
  [
    /^Answer (\d+) refers to a question that is not in this quiz$/,
    () => 'ქვიზი შეიცვალა თამაშის დროს. დაიწყეთ თავიდან.',
  ],
  [
    /^Answer (\d+) repeats a question that was already answered$/,
    () => 'ერთ კითხვას ორჯერ ვერ უპასუხებთ. დაიწყეთ თავიდან.',
  ],
  [/^Content references images that do not exist/, () => 'ტექსტში ჩასმული სურათი აღარ არსებობს.'],
  [
    /^Questions reference images that do not exist/,
    () => 'კითხვაში ჩასმული სურათი აღარ არსებობს. წაშალეთ ის და ატვირთეთ ხელახლა.',
  ],
  [/^Question (\d+) cannot be empty$/, (match) => `კითხვა ${match[1]} ცარიელია.`],
  [
    /^questions\.(\d+)\.answer must be longer than or equal to/,
    (match) => `კითხვა ${Number(match[1]) + 1}: პასუხი სავალდებულოა.`,
  ],
  [/^questions\.(\d+)\.(.+)$/, (match) => `კითხვა ${Number(match[1]) + 1}: ${match[2]}`],
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
    const translated = translateManageError(message, status);
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

/** One backend message → the Georgian text shown in the management area. */
export function translateManageError(message: string, status: number | null): string {
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
