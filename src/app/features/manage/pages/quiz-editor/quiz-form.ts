import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import {
  CreateQuizRequest,
  Quiz,
  QUIZ_OPTION_COUNT,
  QuizQuestionInput,
} from '../../../../core/api/quizzes/quizzes.models';
import { notBlank } from '../../../../shared/validators/not-blank';

const LIMITS = API_LIMITS.quiz;

/** Error key on a question group when two options are the same (trimmed, case-insensitive). */
export const DUPLICATE_OPTIONS_KEY = 'duplicateOptions';
/** Error key on a question group when no option is marked correct. */
export const NO_CORRECT_KEY = 'noCorrect';

export type QuestionForm = FormGroup<{
  /** Server id of an existing question; `''` for a new one. Sent back so its history stays. */
  id: FormControl<string>;
  text: FormControl<string>;
  /** Image id; `''` = no image. */
  imageId: FormControl<string>;
  /** Preview of the saved image (not sent). */
  imageUrl: FormControl<string>;
  imageAlt: FormControl<string>;
  options: FormArray<FormControl<string>>;
  /** 0–3; `-1` = not chosen yet. */
  correctIndex: FormControl<number>;
  explanation: FormControl<string>;
}>;

export interface QuestionFormValue {
  id: string;
  text: string;
  imageId: string;
  imageUrl: string;
  imageAlt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizFormValue {
  title: string;
  description: string;
  coverImageId: string;
  /** Required top-level category. */
  categoryId: string;
  /** `''` = none. */
  subcategoryId: string;
  questions: QuestionFormValue[];
}

export type QuestionField = 'text' | 'imageId' | 'options' | 'correctIndex' | 'explanation';

export interface QuestionErrorTarget {
  index: number;
  field: QuestionField | null;
}

export const EMPTY_QUESTION: QuestionFormValue = {
  id: '',
  text: '',
  imageId: '',
  imageUrl: '',
  imageAlt: '',
  options: Array.from({ length: QUIZ_OPTION_COUNT }, () => ''),
  correctIndex: -1,
  explanation: '',
};

/** Group-level checks: a correct option is marked, and filled options are all different. */
function questionValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { options, correctIndex } = value as Partial<QuestionFormValue>;
  const errors: ValidationErrors = {};
  if (typeof correctIndex !== 'number' || correctIndex < 0) {
    errors[NO_CORRECT_KEY] = true;
  }
  const filled = (options ?? []).map((option) => option.trim().toLowerCase()).filter(Boolean);
  if (new Set(filled).size !== filled.length) {
    errors[DUPLICATE_OPTIONS_KEY] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export function createQuestionForm(
  fb: NonNullableFormBuilder,
  value: QuestionFormValue = EMPTY_QUESTION,
): QuestionForm {
  const options = Array.from({ length: QUIZ_OPTION_COUNT }, (_, index) =>
    fb.control(value.options[index] ?? '', [
      Validators.required,
      notBlank,
      Validators.maxLength(LIMITS.option.max),
    ]),
  );
  return fb.group(
    {
      id: [value.id],
      text: [
        value.text,
        [Validators.required, notBlank, Validators.maxLength(LIMITS.questionText.max)],
      ],
      imageId: [value.imageId],
      imageUrl: [value.imageUrl],
      imageAlt: [value.imageAlt],
      options: fb.array(options),
      correctIndex: [value.correctIndex],
      explanation: [value.explanation, Validators.maxLength(LIMITS.explanation.max)],
    },
    { validators: questionValidator },
  );
}

export function createQuizForm(fb: NonNullableFormBuilder) {
  return fb.group({
    title: ['', [Validators.required, notBlank, Validators.maxLength(LIMITS.title.max)]],
    description: ['', Validators.maxLength(LIMITS.description.max)],
    coverImageId: [''],
    categoryId: ['', Validators.required],
    subcategoryId: [''],
    questions: fb.array<QuestionForm>([], Validators.maxLength(LIMITS.questions.maxCount)),
  });
}

export function toQuizFormValue(quiz: Quiz): QuizFormValue {
  return {
    title: quiz.title,
    description: quiz.description,
    coverImageId: quiz.coverImage?.id ?? '',
    categoryId: quiz.category?.id ?? '',
    subcategoryId: quiz.subcategory?.id ?? '',
    questions: quiz.questions.map((question) => ({
      id: question.id,
      text: question.text,
      imageId: question.image?.id ?? '',
      imageUrl: question.image?.url ?? '',
      imageAlt: question.image?.alt ?? '',
      options: [...question.options],
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    })),
  };
}

/** A copy to insert as a new question: same content, no server id. */
export function copyQuestion(value: QuestionFormValue): QuestionFormValue {
  return { ...value, id: '', options: [...value.options] };
}

function toQuestionInput(value: QuestionFormValue): QuizQuestionInput {
  const explanation = value.explanation.trim();
  return {
    ...(value.id ? { id: value.id } : {}),
    text: value.text.trim(),
    ...(value.imageId ? { imageId: value.imageId } : {}),
    options: value.options.map((option) => option.trim()),
    correctIndex: value.correctIndex,
    ...(explanation ? { explanation } : {}),
  };
}

/**
 * Full body. Always contains every question (PATCH replaces the list). On create, an empty
 * cover / subcategory is omitted; on update it is sent as `null`, which removes it.
 */
export function toQuizRequest(value: QuizFormValue, isUpdate: boolean): CreateQuizRequest {
  const description = value.description.trim();
  const body: CreateQuizRequest = {
    title: value.title.trim(),
    description,
    categoryId: value.categoryId,
    questions: value.questions.map(toQuestionInput),
  };
  if (value.coverImageId || isUpdate) {
    body.coverImageId = value.coverImageId || null;
  }
  if (value.subcategoryId || isUpdate) {
    body.subcategoryId = value.subcategoryId || null;
  }
  return body;
}

/** Whether removing the question would lose anything the user typed. */
export function hasQuestionContent(value: QuestionFormValue): boolean {
  return (
    value.text.trim() !== '' ||
    value.imageId !== '' ||
    value.explanation.trim() !== '' ||
    value.options.some((option) => option.trim() !== '')
  );
}

const ONE_BASED = /^Question (\d+) (options|image|has an id|repeats the id)/;
const PATH = /^questions\.(\d+)\.(\S+)/;
const PATH_FIELDS: Partial<Record<string, QuestionField>> = {
  text: 'text',
  imageId: 'imageId',
  options: 'options',
  correctIndex: 'correctIndex',
  explanation: 'explanation',
};

/**
 * `Question N …` is 1-based; validation paths (`questions.N.text …`) are 0-based. Errors on
 * options, the image or the id are shown on the whole question card.
 */
export function questionErrorTarget(message: string): QuestionErrorTarget | null {
  const oneBased = ONE_BASED.exec(message);
  if (oneBased) {
    return { index: Number(oneBased[1]) - 1, field: null };
  }
  const path = PATH.exec(message);
  if (!path) {
    return null;
  }
  const field = PATH_FIELDS[path[2]] ?? null;
  return {
    index: Number(path[1]),
    field: field === 'text' || field === 'explanation' ? field : null,
  };
}
