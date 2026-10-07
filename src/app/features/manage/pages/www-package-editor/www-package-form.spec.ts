import { describe, expect, it } from 'vitest';
import { hasQuestionContent, questionErrorTarget, toWwwPackageRequest } from './www-package-form';

describe('toWwwPackageRequest', () => {
  it('trims text, cleans authors and omits empty comments', () => {
    expect(
      toWwwPackageRequest({
        name: '  Autumn cup  ',
        date: '2026-10-07',
        categoryId: '',
        authors: [' Giorgi ', '', 'Nino', 'Giorgi'],
        questions: [
          { question: '<p>Q1</p>', answer: '  A1 ', comment: '   ' },
          { question: '<p>Q2</p>', answer: 'A2', comment: ' note ' },
        ],
      }),
    ).toEqual({
      name: 'Autumn cup',
      date: '2026-10-07',
      categoryId: null,
      authors: ['Giorgi', 'Nino'],
      questions: [
        { question: '<p>Q1</p>', answer: 'A1' },
        { question: '<p>Q2</p>', answer: 'A2', comment: 'note' },
      ],
    });
  });

  it('sends the chosen category id', () => {
    expect(
      toWwwPackageRequest({
        name: 'x',
        date: '2026-10-07',
        categoryId: 'abc',
        authors: [],
        questions: [],
      }).categoryId,
    ).toBe('abc');
  });
});

describe('questionErrorTarget', () => {
  it('maps the 1-based empty-question message to a 0-based index', () => {
    expect(questionErrorTarget('Question 3 cannot be empty')).toEqual({
      index: 2,
      field: 'question',
    });
  });

  it('reads the 0-based index and field from validation paths', () => {
    expect(
      questionErrorTarget('questions.1.answer must be longer than or equal to 1 characters'),
    ).toEqual({ index: 1, field: 'answer' });
    expect(questionErrorTarget('questions.0.property x should not exist')).toEqual({
      index: 0,
      field: null,
    });
  });

  it('ignores other messages', () => {
    expect(questionErrorTarget('date must be YYYY-MM-DD')).toBeNull();
  });
});

describe('hasQuestionContent', () => {
  it('is false only for an untouched question', () => {
    expect(hasQuestionContent({ question: '<p><br></p>', answer: ' ', comment: '' })).toBe(false);
    expect(hasQuestionContent({ question: '', answer: 'x', comment: '' })).toBe(true);
    expect(hasQuestionContent({ question: '<p><img src="x"></p>', answer: '', comment: '' })).toBe(
      true,
    );
  });
});
