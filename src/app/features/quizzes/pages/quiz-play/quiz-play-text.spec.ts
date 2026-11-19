import { formatDuration, translateQuizError } from './quiz-play-text';

describe('quiz play text', () => {
  it('formats durations', () => {
    expect(formatDuration(42)).toBe('42 წმ');
    expect(formatDuration(95)).toBe('1 წთ 35 წმ');
  });

  it('translates known errors and keeps unknown ones', () => {
    expect(translateQuizError('Answer 2 refers to a question that is not in this quiz')).toBe(
      'ქვიზი შეიცვალა თამაშის დროს. დაიწყეთ თავიდან.',
    );
    expect(translateQuizError('something else')).toBe('something else');
  });
});
