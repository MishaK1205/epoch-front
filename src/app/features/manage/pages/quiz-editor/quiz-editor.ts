import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { filter, finalize, startWith, take } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { QuizCategoriesApi } from '../../../../core/api/quizzes/quiz-categories-api';
import { QuizzesApi } from '../../../../core/api/quizzes/quizzes-api';
import { Quiz } from '../../../../core/api/quizzes/quizzes.models';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { SERVER_ERROR_KEY } from '../../../../shared/validators/validation-messages';
import { CoverImagePicker } from '../../components/cover-image-picker/cover-image-picker';
import { QuizQuestionCard } from '../../components/quiz-question-card/quiz-question-card';
import { getManageErrorMessages, translateManageError } from '../../manage-errors';
import {
  QUIZ_CATEGORIES_URL,
  QUIZ_CREATED_STATE_KEY,
  QUIZ_PLAY_URL,
  QUIZZES_URL,
} from '../../manage-labels';
import { HasUnsavedChanges } from '../../unsaved-changes-guard';
import {
  copyQuestion,
  createQuestionForm,
  createQuizForm,
  hasQuestionContent,
  QuestionForm,
  questionErrorTarget,
  toQuizFormValue,
  toQuizRequest,
} from './quiz-form';

const LIMITS = API_LIMITS.quiz;
const INVALID_FORM_MESSAGE = 'შეამოწმეთ მონიშნული ველები.';
const SAVED_MESSAGE = 'ცვლილებები შენახულია.';
const CREATED_MESSAGE = 'ქვიზი შეიქმნა.';
const INVALID_SELECTOR = '[formcontrolname].ng-invalid, .card--invalid';
const FOCUSABLE_SELECTOR = 'input, select, textarea';

function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 404;
}

/** `/manage/quizzes/new` and `/manage/quizzes/:id/edit` (admin only). */
@Component({
  selector: 'app-quiz-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Button,
    ConfirmDialog,
    CoverImagePicker,
    EmptyState,
    Icon,
    InputField,
    QuizQuestionCard,
    Select,
    Spinner,
    TextareaField,
  ],
  templateUrl: './quiz-editor.html',
  styleUrl: './quiz-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class QuizEditor implements HasUnsavedChanges, OnInit {
  private readonly api = inject(QuizzesApi);
  private readonly categoriesApi = inject(QuizCategoriesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly leaveDialog = viewChild.required<ConfirmDialog>('leaveDialog');
  private readonly removeDialog = viewChild.required<ConfirmDialog>('removeDialog');

  readonly id = input<string>();
  /** `?categoryId=` (create mode, from a filtered list): a top-level id preselects it. */
  readonly categoryId = input<string>();

  protected readonly limits = LIMITS;
  protected readonly listUrl = QUIZZES_URL;
  protected readonly categoriesUrl = QUIZ_CATEGORIES_URL;
  protected readonly playUrl = QUIZ_PLAY_URL;
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly noCategories = computed(
    () => this.categories.hasValue() && this.categories.value().length === 0,
  );
  protected readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.get(id),
  });
  /** Latest server state (replaced after every save). */
  protected readonly quiz = linkedSignal<Quiz | null>(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );
  protected readonly form = createQuizForm(this.fb);
  protected readonly questions = signal<readonly QuestionForm[]>([]);

  private readonly chosenCategoryId = toSignal(
    this.form.controls.categoryId.valueChanges.pipe(startWith(this.form.controls.categoryId.value)),
    { initialValue: '' },
  );
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    if (this.categories.hasValue()) {
      return this.categories.value().map(({ id, name }) => ({ value: id, label: name }));
    }
    const current = this.quiz()?.category;
    return current ? [{ value: current.id, label: current.name }] : [];
  });
  protected readonly subcategoryOptions = computed<SelectOption[]>(() => {
    const id = this.chosenCategoryId();
    if (this.categories.hasValue()) {
      const parent = this.categories.value().find((category) => category.id === id);
      return (parent?.subcategories ?? []).map((sub) => ({ value: sub.id, label: sub.name }));
    }
    const current = this.quiz()?.subcategory;
    return current ? [{ value: current.id, label: current.name }] : [];
  });

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[QUIZ_CREATED_STATE_KEY] === true
      ? CREATED_MESSAGE
      : '',
  );
  protected readonly quizGone = signal(false);

  protected readonly isNew = computed(() => !this.id());
  protected readonly loading = computed(() => !this.isNew() && this.loaded.isLoading());
  protected readonly notFound = computed(() => isNotFound(this.loaded.error()));
  protected readonly loadErrors = computed(() =>
    this.loaded.error() && !this.notFound() ? getManageErrorMessages(this.loaded.error()) : [],
  );
  protected readonly showForm = computed(() => this.isNew() || this.quiz() !== null);
  protected readonly questionCount = computed(() => this.questions().length);
  protected readonly full = computed(() => this.questionCount() >= LIMITS.questions.maxCount);

  private questionToRemove: QuestionForm | null = null;
  private leaveResolver: ((leave: boolean) => void) | null = null;
  private skipGuard = false;

  constructor() {
    toObservable(this.quiz)
      .pipe(filter(Boolean), take(1), takeUntilDestroyed())
      .subscribe((quiz) => this.fill(quiz));
  }

  ngOnInit(): void {
    const categoryId = this.categoryId();
    if (this.isNew() && categoryId) {
      this.form.controls.categoryId.setValue(categoryId);
    }
    if (this.isNew()) {
      this.addQuestion();
      this.form.markAsPristine();
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (this.skipGuard || !this.form.dirty) {
      return true;
    }
    this.leaveDialog().open();
    return new Promise((resolve) => (this.leaveResolver = resolve));
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.skipGuard && this.form.dirty) {
      event.preventDefault();
    }
  }

  protected resolveLeave(leave: boolean): void {
    this.leaveResolver?.(leave);
    this.leaveResolver = null;
  }

  protected retryLoad(): void {
    this.loaded.reload();
  }

  /** User picks only, so loading a quiz keeps its subcategory. */
  protected categoryPicked(): void {
    this.form.controls.subcategoryId.setValue('');
  }

  protected addQuestion(): void {
    if (this.full()) {
      return;
    }
    this.form.controls.questions.push(createQuestionForm(this.fb));
    this.questionsChanged();
  }

  protected duplicateQuestion(index: number): void {
    const source = this.form.controls.questions.at(index);
    if (this.full() || !source) {
      return;
    }
    const copy = createQuestionForm(this.fb, copyQuestion(source.getRawValue()));
    this.form.controls.questions.insert(index + 1, copy);
    this.questionsChanged();
  }

  protected moveQuestion(index: number, offset: -1 | 1): void {
    const array = this.form.controls.questions;
    const target = index + offset;
    const question = array.at(index);
    if (!question || target < 0 || target >= array.length) {
      return;
    }
    array.removeAt(index, { emitEvent: false });
    array.insert(target, question);
    this.questionsChanged();
  }

  protected removeQuestion(index: number): void {
    const question = this.form.controls.questions.at(index);
    if (!question) {
      return;
    }
    if (hasQuestionContent(question.getRawValue())) {
      this.questionToRemove = question;
      this.removeDialog().open();
    } else {
      this.deleteQuestion(question);
    }
  }

  protected confirmRemove(): void {
    if (this.questionToRemove) {
      this.deleteQuestion(this.questionToRemove);
    }
    this.questionToRemove = null;
  }

  protected cancelRemove(): void {
    this.questionToRemove = null;
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.serverErrors.set([]);
    this.successMessage.set('');
    this.quizGone.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.serverErrors.set([INVALID_FORM_MESSAGE]);
      this.scrollToFirstInvalid();
      return;
    }
    const id = this.id();
    const body = toQuizRequest(this.form.getRawValue(), id !== undefined);
    const request = id ? this.api.update(id, body) : this.api.create(body);
    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          if (id) {
            this.quiz.set(saved);
            this.fill(saved);
            this.successMessage.set(SAVED_MESSAGE);
            return;
          }
          this.skipGuard = true;
          void this.router.navigate([QUIZZES_URL, saved.id, 'edit'], {
            replaceUrl: true,
            state: { [QUIZ_CREATED_STATE_KEY]: true },
          });
        },
        error: (err: unknown) => this.showSaveErrors(err, id !== undefined),
      });
  }

  /** Puts the server state (with new question ids) into the form and marks it pristine. */
  private fill(quiz: Quiz): void {
    const value = toQuizFormValue(quiz);
    const array = this.form.controls.questions;
    while (array.length > value.questions.length) {
      array.removeAt(array.length - 1, { emitEvent: false });
    }
    while (array.length < value.questions.length) {
      array.push(createQuestionForm(this.fb), { emitEvent: false });
    }
    this.form.reset(value);
    this.questions.set([...array.controls]);
  }

  private deleteQuestion(question: QuestionForm): void {
    const array = this.form.controls.questions;
    const index = array.controls.indexOf(question);
    if (index >= 0) {
      array.removeAt(index);
      this.questionsChanged();
    }
  }

  private questionsChanged(): void {
    this.form.markAsDirty();
    this.questions.set([...this.form.controls.questions.controls]);
  }

  private showSaveErrors(err: unknown, isUpdate: boolean): void {
    const status = err instanceof HttpErrorResponse ? err.status : null;
    if (status === 404 && isUpdate) {
      this.quizGone.set(true);
      return;
    }
    for (const message of getApiErrorMessages(err)) {
      const control = this.controlForMessage(message);
      if (control) {
        control.setErrors({
          ...control.errors,
          [SERVER_ERROR_KEY]: translateManageError(message, status),
        });
        control.markAsTouched();
      }
    }
    if (getApiErrorMessages(err).some((message) => message.startsWith('Quiz category'))) {
      this.categories.reload();
    }
    this.serverErrors.set(getManageErrorMessages(err));
    this.scrollToFirstInvalid();
  }

  private controlForMessage(message: string): AbstractControl | null {
    const target = questionErrorTarget(message);
    if (target) {
      const question = this.form.controls.questions.at(target.index);
      if (!question) {
        return null;
      }
      return target.field === 'text' || target.field === 'explanation'
        ? question.controls[target.field]
        : question;
    }
    const { title, description, categoryId, subcategoryId, coverImageId } = this.form.controls;
    if (message.startsWith('title ')) {
      return title;
    }
    if (message.startsWith('description ')) {
      return description;
    }
    if (message.startsWith('Cover image') || message.startsWith('coverImageId')) {
      return coverImageId;
    }
    if (message.includes('ubcategory')) {
      return subcategoryId;
    }
    return message.startsWith('categoryId') || message === 'Quiz category does not exist'
      ? categoryId
      : null;
  }

  private scrollToFirstInvalid(): void {
    afterNextRender(
      () => {
        const invalid = this.host.nativeElement.querySelector<HTMLElement>(INVALID_SELECTOR);
        if (!invalid) {
          return;
        }
        invalid.scrollIntoView({ block: 'center' });
        invalid.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
