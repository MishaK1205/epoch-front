/** Backend messages the play page reacts to. */
export const QUIZ_ERRORS = {
  noQuestions: 'Quiz has no questions yet',
} as const;

const TRANSLATIONS: Partial<Record<string, string>> = {
  [QUIZ_ERRORS.noQuestions]: 'ქვიზში კითხვები ჯერ არ არის.',
  'Quiz not found': 'ქვიზი ვერ მოიძებნა. შესაძლოა წაიშალა.',
};

const PATTERNS: readonly (readonly [RegExp, string])[] = [
  [
    /^Answer \d+ refers to a question that is not in this quiz$/,
    'ქვიზი შეიცვალა თამაშის დროს. დაიწყეთ თავიდან.',
  ],
  [/^Answer \d+ repeats a question/, 'ერთ კითხვას ორჯერ ვერ უპასუხებთ. დაიწყეთ თავიდან.'],
];

/** One backend message → Georgian (unknown messages are shown as-is). */
export function translateQuizError(message: string): string {
  const known = TRANSLATIONS[message];
  if (known) {
    return known;
  }
  return PATTERNS.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}

/** `95` → `1 წთ 35 წმ`; under a minute → `42 წმ`. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} წთ ${seconds} წმ` : `${seconds} წმ`;
}
