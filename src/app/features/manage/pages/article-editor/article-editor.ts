import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
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
import { filter, finalize, Observable, of, switchMap, take, tap } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { Article } from '../../../../core/api/articles/articles.models';
import { AuthService } from '../../../../core/auth/auth-service';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { richTextRequired } from '../../../../shared/validators/rich-text-required';
import { tagListValidator } from '../../../../shared/validators/tag-list';
import { CoverImagePicker } from '../../components/cover-image-picker/cover-image-picker';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { TagsInput } from '../../components/tags-input/tags-input';
import { applyManageErrors, getManageErrorMessages } from '../../manage-errors';
import { ARTICLE_DELETED_STATE_KEY, STATUS_BADGES, STATUS_LABELS } from '../../manage-labels';
import { HasUnsavedChanges } from '../../unsaved-changes-guard';
import {
  ArticleFormValue,
  diffArticleForm,
  toArticleFormValue,
  toCreateRequest,
} from './article-form';

type EditorAction = 'save' | 'publish' | 'unpublish' | 'delete';

/** Navigation state flag set after `create()`, so the edit page can show the success message. */
const CREATED_STATE_KEY = 'articleCreated';
const INVALID_FORM_MESSAGE = 'შეამოწმეთ მონიშნული ველები.';

type CategoryField = 'categoryId' | 'subcategoryId';

/** Backend messages shown on the category pickers instead of the page alert. */
const FIELD_ERRORS: Partial<Record<string, CategoryField>> = {
  'Category does not exist': 'categoryId',
  'categoryId must be a top-level category; send the subcategory as subcategoryId': 'categoryId',
  'Subcategory does not exist': 'subcategoryId',
  'Subcategory does not belong to the selected category': 'subcategoryId',
  'subcategoryId must be a mongodb id': 'subcategoryId',
};
/** The picked category / subcategory is gone: reload the category tree. */
const STALE_CATEGORY_MESSAGES = new Set(['Category does not exist', 'Subcategory does not exist']);

/** `/manage/articles/new` and `/manage/articles/:id`. */
@Component({
  selector: 'app-article-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Badge,
    Button,
    ConfirmDialog,
    Icon,
    InputField,
    Select,
    Spinner,
    CoverImagePicker,
    RichTextEditor,
    TagsInput,
  ],
  templateUrl: './article-editor.html',
  styleUrl: './article-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ArticleEditor implements HasUnsavedChanges {
  private readonly articlesApi = inject(ArticlesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');
  private readonly leaveDialog = viewChild.required<ConfirmDialog>('leaveDialog');

  readonly id = input<string>();

  protected readonly limits = API_LIMITS;
  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.articlesApi.getManaged(id),
  });
  /** Latest server state (updated after save / publish / unpublish). */
  protected readonly article = linkedSignal<Article | null>(() =>
    this.loaded.hasValue() ? this.loaded.value() : null,
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: [
      '',
      [
        Validators.required,
        Validators.minLength(API_LIMITS.articleTitle.min),
        Validators.maxLength(API_LIMITS.articleTitle.max),
      ],
    ],
    categoryId: ['', Validators.required],
    subcategoryId: ['', (control: AbstractControl) => this.subcategoryInCategory(control)],
    coverImageId: ['', Validators.required],
    tags: [[] as string[], tagListValidator(API_LIMITS.tags)],
    content: [
      '',
      [Validators.required, richTextRequired, Validators.maxLength(API_LIMITS.articleContent.max)],
    ],
  });

  protected readonly busy = signal<EditorAction | null>(null);
  protected readonly serverErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[CREATED_STATE_KEY] === true
      ? 'სტატია შეიქმნა და შენახულია დრაფტად.'
      : '',
  );

  protected readonly isNew = computed(() => !this.id());
  protected readonly loading = computed(() => !this.isNew() && this.loaded.isLoading());
  protected readonly loadErrors = computed(() =>
    this.loaded.error() ? getManageErrorMessages(this.loaded.error()) : [],
  );
  protected readonly showForm = computed(() => this.isNew() || this.article() !== null);
  protected readonly published = computed(() => this.article()?.status === 'published');
  protected readonly status = computed(() => {
    const status = this.article()?.status ?? 'draft';
    return { label: STATUS_LABELS[status], badge: STATUS_BADGES[status] };
  });
  /** Top-level categories only; subcategories have their own picker. */
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categoriesStore.categories().map((category) => ({
      value: category.id,
      label: category.name,
    })),
  );
  private readonly categoryId = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  private readonly selectedCategory = computed(() =>
    this.categoriesStore.findTopLevelById(this.categoryId()),
  );
  /** Empty (picker hidden) when no category is picked or it has no subcategories. */
  protected readonly subcategoryOptions = computed<SelectOption[]>(
    () =>
      this.selectedCategory()?.subcategories.map((subcategory) => ({
        value: subcategory.id,
        label: subcategory.name,
      })) ?? [],
  );

  private baseline: ArticleFormValue | null = null;
  private leaveResolver: ((leave: boolean) => void) | null = null;
  private skipGuard = false;

  constructor() {
    toObservable(this.article)
      .pipe(filter(Boolean), take(1), takeUntilDestroyed())
      .subscribe((article) => {
        this.baseline = toArticleFormValue(article);
        this.form.reset(this.baseline);
      });
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (this.skipGuard || !this.hasUnsavedChanges()) {
      return true;
    }
    this.leaveDialog().open();
    return new Promise((resolve) => (this.leaveResolver = resolve));
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.skipGuard && this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  protected resolveLeave(leave: boolean): void {
    this.leaveResolver?.(leave);
    this.leaveResolver = null;
  }

  protected save(): void {
    if (this.busy() || !this.checkValid()) {
      return;
    }
    const value = this.form.getRawValue();
    const id = this.id();
    this.start('save');
    if (!id) {
      this.articlesApi
        .create(toCreateRequest(value))
        .pipe(this.finish())
        .subscribe({
          next: (article) => {
            this.markSaved(article, value);
            void this.router.navigate(['/manage/articles', article.id], {
              replaceUrl: true,
              state: { [CREATED_STATE_KEY]: true },
            });
          },
          error: (err: unknown) => this.showSaveErrors(err),
        });
      return;
    }
    this.update(id, value)
      .pipe(this.finish())
      .subscribe({
        next: () => this.successMessage.set('ცვლილებები შენახულია.'),
        error: (err: unknown) => this.showSaveErrors(err),
      });
  }

  /** The user picked another category: its subcategories differ, so clear the subcategory. */
  protected onCategoryPicked(): void {
    this.form.controls.subcategoryId.setValue('');
  }

  /** Saves pending changes first, then publishes / unpublishes. */
  protected setPublished(publish: boolean): void {
    const id = this.id();
    if (!id || this.busy()) {
      return;
    }
    const dirty = this.hasUnsavedChanges();
    if (dirty && !this.checkValid()) {
      return;
    }
    this.start(publish ? 'publish' : 'unpublish');
    const saved: Observable<unknown> = dirty ? this.update(id, this.form.getRawValue()) : of(null);
    saved
      .pipe(
        switchMap(() => (publish ? this.articlesApi.publish(id) : this.articlesApi.unpublish(id))),
        this.finish(),
      )
      .subscribe({
        next: (article) => {
          this.article.set(article);
          this.successMessage.set(publish ? 'სტატია გამოქვეყნდა.' : 'სტატია დაბრუნდა დრაფტებში.');
        },
        error: (err: unknown) => this.showSaveErrors(err),
      });
  }

  protected askDelete(): void {
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const id = this.id();
    if (!id || this.busy()) {
      return;
    }
    this.start('delete');
    this.articlesApi
      .delete(id)
      .pipe(this.finish())
      .subscribe({
        next: () => {
          this.skipGuard = true;
          void this.router.navigate(['/manage/articles'], {
            state: { [ARTICLE_DELETED_STATE_KEY]: true },
          });
        },
        error: (err: unknown) => this.serverErrors.set(getManageErrorMessages(err)),
      });
  }

  private update(id: string, value: ArticleFormValue): Observable<Article | null> {
    const base = this.baseline;
    const diff = base ? diffArticleForm(base, value) : {};
    if (Object.keys(diff).length === 0) {
      this.form.markAsPristine();
      return of(this.article());
    }
    return this.articlesApi.update(id, diff).pipe(tap((article) => this.markSaved(article, value)));
  }

  private markSaved(article: Article, value: ArticleFormValue): void {
    this.article.set(article);
    this.baseline = { ...value, title: value.title.trim() };
    this.form.markAsPristine();
  }

  private hasUnsavedChanges(): boolean {
    if (!this.form.dirty) {
      return false;
    }
    return this.baseline
      ? Object.keys(diffArticleForm(this.baseline, this.form.getRawValue())).length > 0
      : true;
  }

  /** Category errors go to the pickers (the subcategory one only while it's shown). */
  private showSaveErrors(err: unknown): void {
    if (getApiErrorMessages(err).some((message) => STALE_CATEGORY_MESSAGES.has(message))) {
      this.categoriesStore.reload();
    }
    const { categoryId, subcategoryId } = this.form.controls;
    const controls =
      this.subcategoryOptions().length > 0 ? { categoryId, subcategoryId } : { categoryId };
    const messages = applyManageErrors(err, FIELD_ERRORS, controls);
    this.serverErrors.set(messages.length > 0 ? messages : [INVALID_FORM_MESSAGE]);
  }

  /** A picked subcategory must be one of the selected category's (unknown until loaded). */
  private subcategoryInCategory(control: AbstractControl): ValidationErrors | null {
    const id: unknown = control.value;
    const category = id ? this.selectedCategory() : undefined;
    if (!category || category.subcategories.some((subcategory) => subcategory.id === id)) {
      return null;
    }
    return { subcategory: true };
  }

  private checkValid(): boolean {
    this.form.controls.subcategoryId.updateValueAndValidity();
    if (this.form.valid) {
      return true;
    }
    this.form.markAllAsTouched();
    this.successMessage.set('');
    this.serverErrors.set([INVALID_FORM_MESSAGE]);
    return false;
  }

  private start(action: EditorAction): void {
    this.busy.set(action);
    this.serverErrors.set([]);
    this.successMessage.set('');
  }

  private finish<T>(): (source: Observable<T>) => Observable<T> {
    return (source) =>
      source.pipe(
        finalize(() => this.busy.set(null)),
        takeUntilDestroyed(this.destroyRef),
      );
  }
}
