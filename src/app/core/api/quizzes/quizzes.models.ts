import { ImageSummary } from '../images/images.models';

/** Every question has exactly this many options. */
export const QUIZ_OPTION_COUNT = 4;

export interface QuizCategorySummary {
  id: string;
  name: string;
  slug: string;
}

/** A category or a subcategory. `subcategories` is only on the top-level response. */
export interface QuizCategoryBase extends QuizCategorySummary {
  description?: string; // omitted when empty
  parent: QuizCategorySummary | null; // null for a top-level category
  quizCount: number; // directly here (a top-level category: without its subcategories)
  totalQuizCount: number; // quizCount + every subcategory; equal to quizCount for a subcategory
  createdAt: string;
  updatedAt: string;
}

export interface QuizCategory extends QuizCategoryBase {
  subcategories: QuizCategoryBase[]; // sorted by name; [] for a subcategory
}

export interface CreateQuizCategoryRequest {
  name: string; // 2–50, must contain a letter or digit
  description?: string; // max 500
  parentId?: string; // create only: id of a TOP-LEVEL category → creates a subcategory
}

/** parentId is not allowed. Sending it returns 400 `property parentId should not exist`. */
export type UpdateQuizCategoryRequest = Partial<Omit<CreateQuizCategoryRequest, 'parentId'>>;

/** The CURRENT admin's results for one quiz. */
export interface QuizStats {
  attemptCount: number;
  bestPercent: number | null; // 0–100; null before the first attempt
  lastPercent: number | null;
  lastAttemptAt: string | null;
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string; // '' when empty
  coverImage: ImageSummary | null;
  category: QuizCategorySummary | null; // null only if the category record is missing
  subcategory: QuizCategorySummary | null;
  questionCount: number;
  author: { id: string; username: string } | null;
  myStats: QuizStats;
  createdAt: string;
  updatedAt: string;
}

/** Editor view of a question: includes the answer key. */
export interface QuizQuestion {
  id: string;
  text: string; // plain text
  image: ImageSummary | null;
  options: string[]; // always QUIZ_OPTION_COUNT
  correctIndex: number; // 0–3
  explanation: string; // '' when empty
}

/** `GET /quizzes/:id` (editor only), POST and PATCH. */
export interface Quiz extends QuizSummary {
  questions: QuizQuestion[];
}

/** Play view of a question: no answer key. */
export interface QuizPlayQuestion {
  id: string;
  text: string;
  image: ImageSummary | null;
  options: string[]; // stored order; submit the index in this array
}

/** `GET /quizzes/:id/play`. */
export interface QuizPlay {
  id: string;
  title: string;
  description: string;
  coverImage: ImageSummary | null;
  category: QuizCategorySummary | null;
  subcategory: QuizCategorySummary | null;
  questionCount: number; // total in the quiz; `questions` is shorter when `count` was used
  createdAt: string;
  updatedAt: string;
  questions: QuizPlayQuestion[];
}

export interface QuizQuestionInput {
  id?: string; // update: send to keep an existing question; omit for new ones
  text: string; // 1–1000
  imageId?: string | null; // omit or null = no image
  options: string[]; // exactly 4, each 1–300, all different (case-insensitive)
  correctIndex: number; // 0–3
  explanation?: string; // max 2000
}

export interface CreateQuizRequest {
  title: string; // 1–200
  description?: string; // max 2000
  coverImageId?: string | null; // update: omit keeps, null removes
  categoryId: string; // required, top-level quiz category
  subcategoryId?: string | null; // update: omit keeps, null removes
  questions?: QuizQuestionInput[]; // max 200; PATCH replaces the whole list
}

export type UpdateQuizRequest = Partial<CreateQuizRequest>;

export interface ListQuizzesQuery {
  page?: number;
  limit?: number;
  category?: string; // category OR subcategory slug
  categoryId?: string; // category OR subcategory id
  subcategoryId?: string;
  direct?: boolean; // with a top-level category: only quizzes with no subcategory
  q?: string; // partial, case-insensitive title match; max 100
}

export interface PlayQuizQuery {
  shuffle?: boolean; // shuffle the question order
  count?: number; // 1–200: a random subset
}

export interface SubmitQuizAnswer {
  questionId: string;
  selectedIndex: number | null; // null = skipped
}

export interface SubmitQuizAttemptRequest {
  answers: SubmitQuizAnswer[]; // one per question shown; the score is out of this length
  durationSeconds?: number; // integer 0–86400
}

export interface QuizAttemptAnswer {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number; // as it was when submitted
  correct: boolean;
  explanation: string; // the question's current one; '' if none or removed
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  correctCount: number;
  questionCount: number;
  percent: number; // rounded 0–100
  durationSeconds: number | null;
  answers: QuizAttemptAnswer[];
  createdAt: string;
}
