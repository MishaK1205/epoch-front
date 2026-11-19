import { FormBuilder } from '@angular/forms';
import { Quiz } from '../../../../core/api/quizzes/quizzes.models';
import {
  copyQuestion,
  createQuestionForm,
  DUPLICATE_OPTIONS_KEY,
  EMPTY_QUESTION,
  hasQuestionContent,
  NO_CORRECT_KEY,
  questionErrorTarget,
  QuizFormValue,
  toQuizFormValue,
  toQuizRequest,
} from './quiz-form';

const QUIZ: Quiz = {
  id: 'quiz',
  title: 'დედაქალაქები',
  description: '',
  coverImage: { id: 'cover', url: 'https://x/uploads/a.png' },
  category: { id: 'cat', name: 'გეოგრაფია', slug: 'geografia' },
  subcategory: null,
  questionCount: 1,
  author: null,
  myStats: { attemptCount: 0, bestPercent: null, lastPercent: null, lastAttemptAt: null },
  createdAt: '2026-11-20T12:00:00.000Z',
  updatedAt: '2026-11-20T12:00:00.000Z',
  questions: [
    {
      id: 'q1',
      text: 'საქართველოს დედაქალაქი?',
      image: { id: 'img', url: 'https://x/uploads/b.png', alt: 'რუკა' },
      options: ['ქუთაისი', 'თბილისი', 'ბათუმი', 'რუსთავი'],
      correctIndex: 1,
      explanation: '',
    },
  ],
};

const fb = new FormBuilder().nonNullable;

describe('toQuizRequest', () => {
  it('omits an empty cover and subcategory on create and keeps question ids', () => {
    const value: QuizFormValue = { ...toQuizFormValue(QUIZ), coverImageId: '' };
    const body = toQuizRequest(value, false);
    expect(body.coverImageId).toBeUndefined();
    expect(body.subcategoryId).toBeUndefined();
    expect(body.questions?.[0]).toEqual({
      id: 'q1',
      text: 'საქართველოს დედაქალაქი?',
      imageId: 'img',
      options: ['ქუთაისი', 'თბილისი', 'ბათუმი', 'რუსთავი'],
      correctIndex: 1,
    });
  });

  it('sends null on update to remove the cover and the subcategory', () => {
    const body = toQuizRequest({ ...toQuizFormValue(QUIZ), coverImageId: '' }, true);
    expect(body.coverImageId).toBeNull();
    expect(body.subcategoryId).toBeNull();
  });

  it('trims text and drops a blank explanation and a new question id', () => {
    const body = toQuizRequest(
      {
        ...toQuizFormValue(QUIZ),
        questions: [
          {
            ...EMPTY_QUESTION,
            text: '  ა?  ',
            options: [' 1 ', '2', '3', '4'],
            correctIndex: 0,
            explanation: '  ',
          },
        ],
      },
      false,
    );
    expect(body.questions?.[0]).toEqual({
      text: 'ა?',
      options: ['1', '2', '3', '4'],
      correctIndex: 0,
    });
  });
});

describe('createQuestionForm', () => {
  it('requires a correct option and different options', () => {
    const form = createQuestionForm(fb, { ...EMPTY_QUESTION, options: ['ა', 'ა ', 'ბ', 'გ'] });
    expect(form.hasError(NO_CORRECT_KEY)).toBe(true);
    expect(form.hasError(DUPLICATE_OPTIONS_KEY)).toBe(true);
    form.controls.correctIndex.setValue(2);
    form.controls.options.at(1).setValue('დ');
    expect(form.errors).toBeNull();
  });
});

describe('copyQuestion / hasQuestionContent', () => {
  it('copies without the server id', () => {
    const value = toQuizFormValue(QUIZ).questions[0];
    expect(copyQuestion(value).id).toBe('');
    expect(hasQuestionContent(EMPTY_QUESTION)).toBe(false);
    expect(hasQuestionContent(value)).toBe(true);
  });
});

describe('questionErrorTarget', () => {
  it('maps 1-based messages to the card and 0-based paths to fields', () => {
    expect(questionErrorTarget('Question 3 options must all be different')).toEqual({
      index: 2,
      field: null,
    });
    expect(
      questionErrorTarget('questions.0.text must be shorter than or equal to 1000 characters'),
    ).toEqual({
      index: 0,
      field: 'text',
    });
    expect(questionErrorTarget('questions.1.options must contain at least 4 elements')).toEqual({
      index: 1,
      field: null,
    });
    expect(questionErrorTarget('title must be longer than or equal to 1 characters')).toBeNull();
  });
});
