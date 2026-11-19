import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  getApiErrorMessages,
  QuizAttempt,
  QuizPlayQuestion,
  QuizzesApi,
} from '../../../../core/api';
import { currentPageActive, navigationTick } from '../../../../core/services/active-page';
import { Seo } from '../../../../core/services/seo';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { QuizResult } from '../../components/quiz-result/quiz-result';
import { QUIZ_ERRORS, translateQuizError } from './quiz-play-text';

type Phase = 'intro' | 'playing' | 'result';

/** Labels of the four options. */
const OPTION_LETTERS = ['ა', 'ბ', 'გ', 'დ'] as const;
/** Subset sizes offered on the start screen (only those smaller than the quiz). */
const COUNT_CHOICES = [5, 10, 20, 50] as const;
const HISTORY_SIZE = 10;

/**
 * `/quizzes/:id` — start screen with past results, one question at a time, then the score
 * with every correct answer. Grading happens on the server; the page never loads the key.
 */
@Component({
  selector: 'app-quiz-play',
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Button,
    Checkbox,
    ConfirmDialog,
    EmptyState,
    Icon,
    QuizResult,
    Select,
    Spinner,
  ],
  templateUrl: './quiz-play.html',
  styleUrl: './quiz-play.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPlay {
  private readonly api = inject(QuizzesApi);
  private readonly seo = inject(Seo);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigation = navigationTick();
  private readonly pageActive = currentPageActive();
  private readonly finishDialog = viewChild.required<ConfirmDialog>('finishDialog');

  readonly id = input.required<string>();

  protected readonly letters = OPTION_LETTERS;
  protected readonly quiz = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.play(id),
  });
  protected readonly history = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.listAttempts(id, { limit: HISTORY_SIZE }),
  });
  protected readonly notFound = computed(() => {
    const err = this.quiz.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });
  /** 400 `Quiz has no questions yet` is a normal state, not an error. */
  protected readonly empty = computed(() =>
    getApiErrorMessages(this.quiz.error()).includes(QUIZ_ERRORS.noQuestions),
  );
  protected readonly loadErrors = computed(() =>
    this.quiz.error() && !this.notFound() && !this.empty()
      ? getApiErrorMessages(this.quiz.error()).map(translateQuizError)
      : [],
  );
  protected readonly attempts = computed(() =>
    this.history.hasValue() ? this.history.value().items : [],
  );
  protected readonly attemptTotal = computed(() =>
    this.history.hasValue() ? this.history.value().total : 0,
  );

  protected readonly shuffle = new FormControl(true, { nonNullable: true });
  protected readonly count = new FormControl('', { nonNullable: true });
  protected readonly countOptions = computed<SelectOption[]>(() => {
    const total = this.quiz.hasValue() ? this.quiz.value().questionCount : 0;
    return COUNT_CHOICES.filter((choice) => choice < total).map((choice) => ({
      value: String(choice),
      label: `${choice} შემთხვევითი კითხვა`,
    }));
  });

  protected readonly phase = signal<Phase>('intro');
  protected readonly starting = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly questions = signal<readonly QuizPlayQuestion[]>([]);
  /** Chosen option per question, in `questions` order; `null` = not answered. */
  protected readonly answers = signal<readonly (number | null)[]>([]);
  protected readonly current = signal(0);
  protected readonly result = signal<QuizAttempt | null>(null);
  private startedAt = 0;

  protected readonly question = computed(() => this.questions()[this.current()] ?? null);
  protected readonly selected = computed(() => this.answers()[this.current()] ?? null);
  protected readonly isLast = computed(() => this.current() === this.questions().length - 1);
  protected readonly answeredCount = computed(
    () => this.answers().filter((answer) => answer !== null).length,
  );
  protected readonly unanswered = computed(() => this.questions().length - this.answeredCount());
  protected readonly progress = computed(() =>
    this.questions().length === 0
      ? 0
      : Math.round((this.answeredCount() / this.questions().length) * 100),
  );
  protected readonly finishMessage = computed(
    () => `${this.unanswered()} კითხვა უპასუხოდ დარჩა და არასწორად ჩაითვლება. დავასრულოთ მაინც?`,
  );
  constructor() {
    effect(() => {
      this.navigation();
      if (this.pageActive() && this.quiz.hasValue()) {
        this.seo.update({ title: `${this.quiz.value().title} — ქვიზი — Epoch` });
      }
    });
  }

  protected retry(): void {
    this.quiz.reload();
  }

  /** Asks for a fresh set every time (order and subset can differ). */
  protected start(): void {
    if (this.starting()) {
      return;
    }
    const count = Number(this.count.value) || undefined;
    this.errors.set([]);
    this.starting.set(true);
    this.api
      .play(this.id(), { shuffle: this.shuffle.value, count })
      .pipe(
        finalize(() => this.starting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (play) => {
          this.questions.set(play.questions);
          this.answers.set(play.questions.map(() => null));
          this.current.set(0);
          this.result.set(null);
          this.startedAt = Date.now();
          this.phase.set('playing');
        },
        error: (err: unknown) => this.errors.set(getApiErrorMessages(err).map(translateQuizError)),
      });
  }

  protected choose(index: number): void {
    const position = this.current();
    this.answers.update((answers) =>
      answers.map((answer, at) => (at === position ? (answer === index ? null : index) : answer)),
    );
  }

  protected goTo(index: number): void {
    if (index >= 0 && index < this.questions().length) {
      this.current.set(index);
    }
  }

  protected next(): void {
    if (this.isLast()) {
      this.askFinish();
    } else {
      this.goTo(this.current() + 1);
    }
  }

  protected askFinish(): void {
    if (this.unanswered() > 0) {
      this.finishDialog().open();
    } else {
      this.submit();
    }
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    const answers = this.answers();
    const body = {
      answers: this.questions().map((item, index) => ({
        questionId: item.id,
        selectedIndex: answers[index] ?? null,
      })),
      durationSeconds: Math.min(86_400, Math.round((Date.now() - this.startedAt) / 1000)),
    };
    this.errors.set([]);
    this.submitting.set(true);
    this.api
      .submitAttempt(this.id(), body)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (attempt) => {
          this.result.set(attempt);
          this.phase.set('result');
          this.history.reload();
        },
        error: (err: unknown) => this.errors.set(getApiErrorMessages(err).map(translateQuizError)),
      });
  }

  protected backToIntro(): void {
    this.phase.set('intro');
    this.errors.set([]);
  }
}
