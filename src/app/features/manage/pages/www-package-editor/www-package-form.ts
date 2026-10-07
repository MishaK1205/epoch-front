import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import {
  CreateWhatWhereWhenRequest,
  WhatWhereWhenPackage,
} from '../../../../core/api/what-where-when/what-where-when.models';
import { toLocalDateString } from '../../../../shared/utils/local-date';
import { notBlank } from '../../../../shared/validators/not-blank';
import { realDate } from '../../../../shared/validators/real-date';
import {
  isRichTextEmpty,
  richTextRequired,
} from '../../../../shared/validators/rich-text-required';
import { tagListValidator } from '../../../../shared/validators/tag-list';

const LIMITS = API_LIMITS.whatWhereWhen;

export type QuestionForm = FormGroup<{
  /** Quill HTML (`''` when the editor is empty). */
  question: FormControl<string>;
  answer: FormControl<string>;
  comment: FormControl<string>;
}>;

export interface QuestionFormValue {
  question: string;
  answer: string;
  comment: string;
}

export interface WwwPackageFormValue {
  name: string;
  date: string;
  /** `''` = no category (the shared `Select` uses `''` for its empty option). */
  categoryId: string;
  authors: string[];
  questions: QuestionFormValue[];
}

export type QuestionField = keyof QuestionFormValue;

/** Which question (0-based) — and which of its fields, if known — a backend message is about. */
export interface QuestionErrorTarget {
  index: number;
  field: QuestionField | null;
}

const EMPTY_QUESTION: QuestionFormValue = { question: '', answer: '', comment: '' };

export function createQuestionForm(
  fb: NonNullableFormBuilder,
  value: QuestionFormValue = EMPTY_QUESTION,
): QuestionForm {
  return fb.group({
    question: [
      value.question,
      [Validators.required, richTextRequired, Validators.maxLength(LIMITS.question.max)],
    ],
    answer: [
      value.answer,
      [Validators.required, notBlank, Validators.maxLength(LIMITS.answer.max)],
    ],
    comment: [value.comment, Validators.maxLength(LIMITS.comment.max)],
  });
}

/** New packages default to today's local date. */
export function createPackageForm(fb: NonNullableFormBuilder) {
  return fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(LIMITS.name.max)]],
    date: [
      toLocalDateString(new Date()),
      [Validators.required, Validators.pattern(LIMITS.date.pattern), realDate],
    ],
    categoryId: [''],
    authors: [[] as string[], tagListValidator(LIMITS.authors)],
    questions: fb.array<QuestionForm>([], Validators.maxLength(LIMITS.questions.maxCount)),
  });
}

export function toWwwPackageFormValue(pkg: WhatWhereWhenPackage): WwwPackageFormValue {
  return {
    name: pkg.name,
    date: pkg.date,
    categoryId: pkg.category?.id ?? '',
    authors: [...pkg.authors],
    questions: pkg.questions.map(({ question, answer, comment }) => ({
      question,
      answer,
      comment,
    })),
  };
}

/**
 * Full request body (create and update): trimmed text, authors without empty / duplicate names,
 * empty comments omitted. Always contains every question, because PATCH replaces the list, and
 * `categoryId` (`null` = no category, which also removes it on update).
 */
export function toWwwPackageRequest(value: WwwPackageFormValue): CreateWhatWhereWhenRequest {
  const authors = value.authors.map((author) => author.trim()).filter(Boolean);
  return {
    name: value.name.trim(),
    date: value.date,
    categoryId: value.categoryId || null,
    authors: [...new Set(authors)],
    questions: value.questions.map((item) => {
      const comment = item.comment.trim();
      return {
        question: item.question,
        answer: item.answer.trim(),
        ...(comment ? { comment } : {}),
      };
    }),
  };
}

/** Whether removing the question would lose anything the user typed. */
export function hasQuestionContent(value: QuestionFormValue): boolean {
  return (
    !isRichTextEmpty(value.question) || value.answer.trim() !== '' || value.comment.trim() !== ''
  );
}

const EMPTY_QUESTION_MESSAGE = /^Question (\d+) cannot be empty$/;
const QUESTION_PATH_MESSAGE = /^questions\.(\d+)\.(\S+)/;
const QUESTION_FIELDS: readonly QuestionField[] = ['question', 'answer', 'comment'];

/**
 * `Question N cannot be empty` is 1-based; validation paths (`questions.N.answer …`) are 0-based.
 * Unknown properties (`questions.N.property x should not exist`) target the whole question.
 */
export function questionErrorTarget(message: string): QuestionErrorTarget | null {
  const empty = EMPTY_QUESTION_MESSAGE.exec(message);
  if (empty) {
    return { index: Number(empty[1]) - 1, field: 'question' };
  }
  const path = QUESTION_PATH_MESSAGE.exec(message);
  if (!path) {
    return null;
  }
  const field = QUESTION_FIELDS.find((name) => name === path[2]) ?? null;
  return { index: Number(path[1]), field };
}
