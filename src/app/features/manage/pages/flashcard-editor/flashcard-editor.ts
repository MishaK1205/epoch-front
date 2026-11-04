import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { filter, finalize, take } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { FlashcardCategoriesApi } from '../../../../core/api/flashcards/flashcard-categories-api';
import { FlashcardsApi } from '../../../../core/api/flashcards/flashcards-api';
import { Flashcard, FlashcardCategory } from '../../../../core/api/flashcards/flashcards.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { notBlank } from '../../../../shared/validators/not-blank';
import { applyManageErrors, getManageErrorMessages } from '../../manage-errors';
import {
  FLASHCARD_CARDS_URL,
  FLASHCARD_CATEGORIES_URL,
  FLASHCARD_CREATED_STATE_KEY,
} from '../../manage-labels';
import { HasUnsavedChanges } from '../../unsaved-changes-guard';
import {
  FlashcardFormValue,
  toCreateFlashcardRequest,
  toFlashcardFormValue,
  toUpdateFlashcardRequest,
} from './flashcard-form';

const LIMITS = API_LIMITS.flashcard;
const INVALID_FORM_MESSAGE = 'შეამოწმეთ მონიშნული ველები.';
const DELETED_MESSAGE = 'ეს ფლეშბარათი წაშლილია.';

type CardField = 'front' | 'back' | 'note' | 'categoryId' | 'subcategoryId' | 'position';

const FIELD_ERRORS: Partial<Record<string, CardField>> = {
  'front must be longer than or equal to 1 characters': 'front',
  'front must be shorter than or equal to 500 characters': 'front',
  'back must be longer than or equal to 1 characters': 'back',
  'back must be shorter than or equal to 2000 characters': 'back',
  'note must be shorter than or equal to 2000 characters': 'note',
  'Flashcard category does not exist': 'categoryId',
  'categoryId must be a top-level flashcard category; send the subcategory as subcategoryId':
    'categoryId',
  'Flashcard subcategory does not exist': 'subcategoryId',
  'Subcategory does not belong to the selected flashcard category': 'subcategoryId',
  'position must be an integer number': 'position',
  'position must not be less than 0': 'position',
  'position must not be greater than 1000000': 'position',
};

const POSITION_ERRORS = {
  pattern: 'მიუთითეთ მთელი რიცხვი 0-დან 1 000 000-მდე.',
  min: 'მინიმუმ 0.',
  max: 'მაქსიმუმ 1 000 000.',
};

/** `/manage/flashcards/new` and `/manage/flashcards/:id/edit`. Plain text, no Quill. */
@Component({
  selector: 'app-flashcard-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Alert,
    Button,
    ConfirmDialog,
    Icon,
    InputField,
    Select,
    Spinner,
    TextareaField,
  ],
  templateUrl: './flashcard-editor.html',
  styleUrl: './flashcard-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class FlashcardEditor implements HasUnsavedChanges, OnInit {
  private readonly flashcardsApi = inject(FlashcardsApi);
  private readonly categoriesApi = inject(FlashcardCategoriesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly leaveDialog = viewChild.required<ConfirmDialog>('leaveDialog');

  /** Route param on edit. Absent on `/new`. */
  readonly id = input<string>();
  /** Query params from a deck's "new card" link. */
  readonly categoryId = input<string>();
  readonly subcategoryId = input<string>();

  protected readonly limits = LIMITS;
  protected readonly positionErrors = POSITION_ERRORS;
  protected readonly cardsUrl = FLASHCARD_CARDS_URL;
  protected readonly categoriesUrl = FLASHCARD_CATEGORIES_URL;
  protected readonly deletedMessage = DELETED_MESSAGE;

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.flashcardsApi.get(id),
  });
  private readonly loadedCard = computed(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );
  private readonly categoryList = computed(() =>
    this.categories.hasValue() ? this.categories.value() : null,
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    front: ['', [Validators.required, notBlank, Validators.maxLength(LIMITS.front.max)]],
    back: ['', [Validators.required, notBlank, Validators.maxLength(LIMITS.back.max)]],
    note: ['', Validators.maxLength(LIMITS.note.max)],
    categoryId: ['', Validators.required],
    subcategoryId: ['', (control: AbstractControl) => this.subcategoryBelongs(control)],
    position: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d+$/),
        Validators.min(LIMITS.position.min),
        Validators.max(LIMITS.position.max),
      ],
    ],
  });

  private readonly selectedCategoryId = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    (this.categoryList() ?? []).map((category) => ({ value: category.id, label: category.name })),
  );
  protected readonly subcategoryOptions = computed<SelectOption[]>(() => {
    const category = (this.categoryList() ?? []).find(
      (item) => item.id === this.selectedCategoryId(),
    );
    return (
      category?.subcategories.map((subcategory) => ({
        value: subcategory.id,
        label: subcategory.name,
      })) ?? []
    );
  });

  protected readonly isNew = computed(() => !this.id());
  protected readonly deleted = computed(() => {
    const err = this.loaded.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });
  protected readonly cardErrors = computed(() =>
    !this.isNew() && this.loaded.error() && !this.deleted()
      ? getManageErrorMessages(this.loaded.error())
      : [],
  );
  protected readonly categoryErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );
  private readonly hydrated = signal(false);
  private readonly preselected = signal(false);
  protected readonly loading = computed(() => {
    if (!this.isNew() && (this.deleted() || this.cardErrors().length > 0)) {
      return false;
    }
    if (!this.categories.hasValue() && !this.categories.error()) {
      return true;
    }
    if (this.isNew()) {
      return this.categories.hasValue() && !this.preselected();
    }
    return !this.hydrated();
  });

  protected readonly busy = signal(false);
  protected readonly serverErrors = signal<string[]>([]);
  protected readonly successMessage = signal('');

  private current: Flashcard | null = null;
  private leaveResolver: ((leave: boolean) => void) | null = null;
  private skipGuard = false;

  constructor() {
    toObservable(this.loadedCard)
      .pipe(
        filter((card): card is Flashcard => card !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((card) => {
        this.resetFrom(card);
        this.hydrated.set(true);
      });
    toObservable(this.categoryList)
      .pipe(
        filter((list): list is FlashcardCategory[] => list !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.preselect(list);
        this.preselected.set(true);
      });
  }

  ngOnInit(): void {
    if (!this.id()) {
      this.form.controls.position.disable({ emitEvent: false });
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

  protected retryCategories(): void {
    this.categories.reload();
  }

  /** Drop a subcategory that is not a child of the category the admin just picked. */
  protected onCategoryPicked(categoryId: string): void {
    const subId = this.form.controls.subcategoryId.value;
    const category = (this.categoryList() ?? []).find((item) => item.id === categoryId);
    if (!subId || category?.subcategories.some((subcategory) => subcategory.id === subId)) {
      return;
    }
    this.form.controls.subcategoryId.setValue('');
  }

  protected save(): void {
    if (this.busy()) {
      return;
    }
    this.form.controls.subcategoryId.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.successMessage.set('');
      this.serverErrors.set([INVALID_FORM_MESSAGE]);
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.serverErrors.set([]);
    this.successMessage.set('');
    const id = this.id();
    if (!id) {
      this.flashcardsApi
        .create(toCreateFlashcardRequest(value))
        .pipe(
          finalize(() => this.busy.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.form.markAsPristine();
            this.skipGuard = true;
            void this.router.navigate([FLASHCARD_CARDS_URL], {
              queryParams: {
                categoryId: value.categoryId,
                subcategoryId: value.subcategoryId || null,
              },
              state: { [FLASHCARD_CREATED_STATE_KEY]: true },
            });
          },
          error: (err: unknown) => this.showSaveErrors(err),
        });
      return;
    }
    const card = this.current;
    if (!card) {
      this.busy.set(false);
      return;
    }
    this.flashcardsApi
      .update(id, toUpdateFlashcardRequest(card, value))
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.resetFrom(updated);
          this.successMessage.set('ცვლილებები შენახულია.');
        },
        error: (err: unknown) => this.showSaveErrors(err),
      });
  }

  private resetFrom(card: Flashcard): void {
    this.current = card;
    this.form.reset(toFlashcardFormValue(card));
  }

  private preselect(categories: readonly FlashcardCategory[]): void {
    if (this.id() || this.form.dirty) {
      return;
    }
    const category = categories.find((item) => item.id === this.categoryId());
    if (!category) {
      return;
    }
    const subcategory = category.subcategories.find((item) => item.id === this.subcategoryId());
    this.form.patchValue({
      categoryId: category.id,
      subcategoryId: subcategory?.id ?? '',
    });
  }

  private showSaveErrors(err: unknown): void {
    const raw = getApiErrorMessages(err);
    if (raw.includes('Flashcard category does not exist')) {
      this.categories.reload();
      this.form.controls.categoryId.setValue('');
      this.form.controls.subcategoryId.setValue('');
    } else if (raw.includes('Flashcard subcategory does not exist')) {
      this.categories.reload();
      this.form.controls.subcategoryId.setValue('');
    }
    const { front, back, note, categoryId, subcategoryId, position } = this.form.controls;
    const controls =
      this.subcategoryOptions().length > 0
        ? { front, back, note, categoryId, subcategoryId, position }
        : { front, back, note, categoryId, position };
    const messages = applyManageErrors(err, FIELD_ERRORS, controls);
    this.serverErrors.set(messages.length > 0 ? messages : [INVALID_FORM_MESSAGE]);
  }

  /**
   * A picked subcategory must belong to the selected category (unknown until the tree loads).
   * Reads the sibling control — `this.form` is still being constructed the first time this runs.
   */
  private subcategoryBelongs(control: AbstractControl): ValidationErrors | null {
    const id: unknown = control.value;
    if (typeof id !== 'string' || id === '') {
      return null;
    }
    const categoryId = control.parent?.get('categoryId')?.value;
    if (typeof categoryId !== 'string' || categoryId === '') {
      return null;
    }
    const category = (this.categoryList() ?? []).find((item) => item.id === categoryId);
    if (!category || category.subcategories.some((subcategory) => subcategory.id === id)) {
      return null;
    }
    return { subcategory: true };
  }
}
