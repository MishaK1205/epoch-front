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
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { filter, finalize, take } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { WhatWhereWhenApi } from '../../../../core/api/what-where-when/what-where-when-api';
import { WhatWhereWhenCategoriesApi } from '../../../../core/api/what-where-when/what-where-when-categories-api';
import { WhatWhereWhenPackage } from '../../../../core/api/what-where-when/what-where-when.models';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { SERVER_ERROR_KEY } from '../../../../shared/validators/validation-messages';
import { TagsInput } from '../../components/tags-input/tags-input';
import { WwwQuestionCard } from '../../components/www-question-card/www-question-card';
import { WwwQuestionImport } from '../../components/www-question-import/www-question-import';
import { getManageErrorMessages, translateManageError } from '../../manage-errors';
import {
  WWW_CATEGORIES_URL,
  WWW_PACKAGE_CREATED_STATE_KEY,
  WWW_PACKAGES_URL,
} from '../../manage-labels';
import { HasUnsavedChanges } from '../../unsaved-changes-guard';
import {
  createPackageForm,
  createQuestionForm,
  hasQuestionContent,
  QuestionForm,
  QuestionFormValue,
  questionErrorTarget,
  toWwwPackageFormValue,
  toWwwPackageRequest,
} from './www-package-form';

const LIMITS = API_LIMITS.whatWhereWhen;
const LIST_URL = WWW_PACKAGES_URL;
const INVALID_FORM_MESSAGE = 'შეამოწმეთ მონიშნული ველები.';
const TOO_LARGE_MESSAGE = 'პაკეტი ძალიან დიდია შესანახად. შეამცირეთ კითხვების ტექსტი.';
const SAVED_MESSAGE = 'ცვლილებები შენახულია.';
/** The chosen category was deleted meanwhile (create / update 400). */
const CATEGORY_MISSING = 'Category does not exist';
const CATEGORY_MISSING_FIELD_MESSAGE =
  'არჩეული კატეგორია წაიშალა. აირჩიეთ სხვა კატეგორია ან „კატეგორიის გარეშე“.';
/** First invalid control (DOM order) after a failed submit. */
const INVALID_SELECTOR = '[formcontrolname].ng-invalid, .card--invalid';
const FOCUSABLE_SELECTOR = 'input, select, textarea, [contenteditable="true"]';

function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 404;
}

/** `/manage/what-where-when/new` and `/manage/what-where-when/:id/edit` (admin only). */
@Component({
  selector: 'app-www-package-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    InputField,
    Select,
    Spinner,
    TagsInput,
    WwwQuestionCard,
    WwwQuestionImport,
  ],
  templateUrl: './www-package-editor.html',
  styleUrl: './www-package-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class WwwPackageEditor implements HasUnsavedChanges, OnInit {
  private readonly api = inject(WhatWhereWhenApi);
  private readonly categoriesApi = inject(WhatWhereWhenCategoriesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly leaveDialog = viewChild.required<ConfirmDialog>('leaveDialog');
  private readonly removeDialog = viewChild.required<ConfirmDialog>('removeDialog');

  readonly id = input<string>();
  /** `?categoryId=` (create mode, from a filtered list): preselected category. */
  readonly categoryId = input<string>();

  protected readonly limits = LIMITS;
  protected readonly listUrl = LIST_URL;
  protected readonly categoriesUrl = WWW_CATEGORIES_URL;
  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly noCategories = computed(
    () => this.categories.hasValue() && this.categories.value().length === 0,
  );
  /** Sorted by name by the server. Until the list loads, the package's own category is shown. */
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    if (this.categories.hasValue()) {
      return this.categories.value().map(({ id, name }) => ({ value: id, label: name }));
    }
    const current = this.pkg()?.category;
    return current ? [{ value: current.id, label: current.name }] : [];
  });
  protected readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.get(id),
  });
  /** Latest server state (replaced after every save). */
  protected readonly pkg = linkedSignal<WhatWhereWhenPackage | null>(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );
  protected readonly form = createPackageForm(this.fb);
  /** Mirrors `form.controls.questions.controls` (form arrays aren't signals). */
  protected readonly questions = signal<readonly QuestionForm[]>([]);
  /** The question just added / duplicated: its editor takes focus when ready. */
  protected readonly focusTarget = signal<QuestionForm | null>(null);

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);
  protected readonly successMessage = signal('');
  /** PATCH returned 404: someone deleted the package. */
  protected readonly packageGone = signal(false);

  protected readonly isNew = computed(() => !this.id());
  protected readonly loading = computed(() => !this.isNew() && this.loaded.isLoading());
  protected readonly notFound = computed(() => isNotFound(this.loaded.error()));
  protected readonly loadErrors = computed(() =>
    this.loaded.error() && !this.notFound() ? getManageErrorMessages(this.loaded.error()) : [],
  );
  protected readonly showForm = computed(() => this.isNew() || this.pkg() !== null);
  protected readonly questionCount = computed(() => this.questions().length);
  protected readonly full = computed(() => this.questionCount() >= LIMITS.questions.maxCount);
  protected readonly importCapacity = computed(() =>
    Math.max(0, LIMITS.questions.maxCount - this.questionCount()),
  );
  protected readonly backLink = computed(() => {
    const id = this.id();
    return id ? [LIST_URL, id] : [LIST_URL];
  });

  private questionToRemove: QuestionForm | null = null;
  private leaveResolver: ((leave: boolean) => void) | null = null;
  private skipGuard = false;

  constructor() {
    toObservable(this.pkg)
      .pipe(filter(Boolean), take(1), takeUntilDestroyed())
      .subscribe((pkg) => this.fill(pkg));
  }

  ngOnInit(): void {
    const categoryId = this.categoryId();
    if (this.isNew() && categoryId) {
      this.form.controls.categoryId.setValue(categoryId);
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

  protected addQuestion(): void {
    if (this.full()) {
      return;
    }
    const question = createQuestionForm(this.fb);
    this.form.controls.questions.push(question);
    this.focusTarget.set(question);
    this.questionsChanged();
  }

  protected duplicateQuestion(index: number): void {
    const source = this.form.controls.questions.at(index);
    if (this.full() || !source) {
      return;
    }
    const copy = createQuestionForm(this.fb, source.getRawValue());
    this.form.controls.questions.insert(index + 1, copy);
    this.focusTarget.set(copy);
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

  /**
   * Appends questions read from a document. Empty questions are dropped first, so a "new
   * question" added by mistake doesn't stay in front. Incomplete ones show their errors at once.
   */
  protected importQuestions(values: QuestionFormValue[]): void {
    const array = this.form.controls.questions;
    for (let index = array.length - 1; index >= 0; index--) {
      if (!hasQuestionContent(array.at(index).getRawValue())) {
        array.removeAt(index, { emitEvent: false });
      }
    }
    for (const value of values.slice(0, LIMITS.questions.maxCount - array.length)) {
      const question = createQuestionForm(this.fb, value);
      if (question.invalid) {
        question.markAllAsTouched();
      }
      array.push(question, { emitEvent: false });
    }
    this.focusTarget.set(null);
    this.questionsChanged();
  }

  /** Asks first when the question has any content. */
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
    this.packageGone.set(false);
    // The "category was deleted" server error only asks to choose again; it must not block a
    // save with the same choice ("No category" can't be re-picked in a native select).
    this.form.controls.categoryId.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.serverErrors.set([INVALID_FORM_MESSAGE]);
      this.scrollToFirstInvalid();
      return;
    }
    const id = this.id();
    const body = toWwwPackageRequest(this.form.getRawValue());
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
            this.pkg.set(saved);
            this.fill(saved);
            this.successMessage.set(SAVED_MESSAGE);
            return;
          }
          this.skipGuard = true;
          void this.router.navigate([LIST_URL, saved.id], {
            replaceUrl: true,
            state: { [WWW_PACKAGE_CREATED_STATE_KEY]: true },
          });
        },
        error: (err: unknown) => this.showSaveErrors(err, id !== undefined),
      });
  }

  /** Puts the server state (sanitized HTML, trimmed text) into the form and marks it pristine. */
  private fill(pkg: WhatWhereWhenPackage): void {
    const value = toWwwPackageFormValue(pkg);
    const array = this.form.controls.questions;
    while (array.length > value.questions.length) {
      array.removeAt(array.length - 1, { emitEvent: false });
    }
    while (array.length < value.questions.length) {
      array.push(createQuestionForm(this.fb), { emitEvent: false });
    }
    this.form.reset(value);
    this.focusTarget.set(null);
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

  /** Adding / moving / removing questions doesn't mark the form dirty by itself. */
  private questionsChanged(): void {
    this.form.markAsDirty();
    this.questions.set([...this.form.controls.questions.controls]);
  }

  private showSaveErrors(err: unknown, isUpdate: boolean): void {
    const status = err instanceof HttpErrorResponse ? err.status : null;
    if (status === 413) {
      this.serverErrors.set([TOO_LARGE_MESSAGE]);
      return;
    }
    if (status === 404 && isUpdate) {
      this.packageGone.set(true);
      return;
    }
    for (const message of getApiErrorMessages(err)) {
      if (message === CATEGORY_MISSING) {
        this.resetMissingCategory();
        continue;
      }
      const control = this.controlForMessage(message);
      if (control) {
        control.setErrors({
          ...control.errors,
          [SERVER_ERROR_KEY]: translateManageError(message, status),
        });
        control.markAsTouched();
      }
    }
    this.serverErrors.set(getManageErrorMessages(err));
    this.scrollToFirstInvalid();
  }

  /** Reloads the categories, selects "No category" and flags the field. */
  private resetMissingCategory(): void {
    const control = this.form.controls.categoryId;
    this.categories.reload();
    control.setValue('');
    control.markAsDirty();
    control.setErrors({ [SERVER_ERROR_KEY]: CATEGORY_MISSING_FIELD_MESSAGE });
    control.markAsTouched();
  }

  private controlForMessage(message: string): AbstractControl | null {
    const target = questionErrorTarget(message);
    if (target) {
      const question = this.form.controls.questions.at(target.index);
      if (!question) {
        return null;
      }
      return target.field ? question.controls[target.field] : question;
    }
    const { name, date, categoryId, authors } = this.form.controls;
    if (message.startsWith('name ')) {
      return name;
    }
    if (message.startsWith('date ')) {
      return date;
    }
    if (message.startsWith('categoryId ')) {
      return categoryId;
    }
    return message.startsWith('authors') ? authors : null;
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
