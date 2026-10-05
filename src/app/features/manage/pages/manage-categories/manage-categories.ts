import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { CategoriesApi } from '../../../../core/api/categories/categories-api';
import { Category, CategoryBase } from '../../../../core/api/categories/categories.models';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { CategoryForm, CategoryFormValue } from '../../components/category-form/category-form';
import {
  toCreateCategoryRequest,
  toUpdateCategoryRequest,
} from '../../components/category-form/category-request';
import { CategoryRow } from '../../components/category-row/category-row';
import { getCategoryDeleteConflict, getManageErrorMessages } from '../../manage-errors';

type InlineForm = { kind: 'edit'; id: string } | { kind: 'add'; parentId: string };

interface DeleteConflict {
  category: CategoryBase;
  kind: 'subcategories' | 'articles';
}

const PARENT_MISSING = 'Parent category does not exist';

/**
 * `/manage/categories` (admin): two-level tree of categories and subcategories; create, rename /
 * describe and delete them. The parent of a subcategory can't change.
 */
@Component({
  selector: 'app-manage-categories',
  imports: [
    RouterLink,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Spinner,
    CategoryForm,
    CategoryRow,
  ],
  templateUrl: './manage-categories.html',
  styleUrls: ['../../manage-page.scss', './manage-categories.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCategories {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly createForm = viewChild.required<CategoryForm>('createForm');
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly creating = signal(false);
  protected readonly inline = signal<InlineForm | null>(null);
  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<CategoryBase | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly deleteConflict = signal<DeleteConflict | null>(null);

  /** Top-level categories with their `subcategories`. */
  protected readonly items = computed<Category[]>(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly editingId = computed(() => {
    const inline = this.inline();
    return inline?.kind === 'edit' ? inline.id : null;
  });
  protected readonly addingToId = computed(() => {
    const inline = this.inline();
    return inline?.kind === 'add' ? inline.parentId : null;
  });
  protected readonly loadErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );
  protected readonly deleteMessage = computed(() => {
    const category = this.toDelete();
    const kind = category?.parent ? 'ქვეკატეგორია' : 'კატეგორია';
    return `${kind} „${category?.name ?? ''}“ სამუდამოდ წაიშლება.`;
  });

  protected create(value: CategoryFormValue, form: CategoryForm): void {
    this.creating.set(true);
    this.run(
      this.categoriesApi.create(toCreateCategoryRequest(value)),
      () => this.creating.set(false),
      (category) => {
        form.reset();
        if (form !== this.createForm()) {
          this.inline.set(null);
        }
        return category.parent
          ? `ქვეკატეგორია „${category.name}“ დაემატა კატეგორიაში „${category.parent.name}“.`
          : `კატეგორია „${category.name}“ დაემატა.`;
      },
      form,
    );
  }

  protected startEdit(category: CategoryBase): void {
    this.clearMessages();
    this.inline.set({ kind: 'edit', id: category.id });
  }

  protected startAddSubcategory(category: Category): void {
    this.clearMessages();
    this.inline.set({ kind: 'add', parentId: category.id });
  }

  protected update(category: CategoryBase, value: CategoryFormValue, form: CategoryForm): void {
    const diff = toUpdateCategoryRequest(category, value);
    if (Object.keys(diff).length === 0) {
      this.inline.set(null);
      return;
    }
    this.pendingId.set(category.id);
    this.run(
      this.categoriesApi.update(category.id, diff),
      () => this.pendingId.set(null),
      (updated) => {
        this.inline.set(null);
        return `${updated.parent ? 'ქვეკატეგორია' : 'კატეგორია'} „${updated.name}“ განახლდა.`;
      },
      form,
    );
  }

  protected askDelete(category: CategoryBase): void {
    this.toDelete.set(category);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const category = this.toDelete();
    if (!category) {
      return;
    }
    this.pendingId.set(category.id);
    this.run(
      this.categoriesApi.delete(category.id),
      () => this.pendingId.set(null),
      () => `${category.parent ? 'ქვეკატეგორია' : 'კატეგორია'} „${category.name}“ წაიშალა.`,
      null,
      (err) => {
        const kind = getCategoryDeleteConflict(err);
        this.deleteConflict.set(kind ? { category, kind } : null);
        if (kind) {
          this.reload();
        }
      },
    );
  }

  protected showSubcategories(category: CategoryBase): void {
    const list = this.document.getElementById(`subcategories-${category.id}`);
    list?.scrollIntoView({ block: 'center' });
    list?.focus({ preventScroll: true });
  }

  /**
   * Runs a mutation, then reloads this list and the app-wide `CategoriesStore`. Field errors go to
   * `form` when given.
   */
  private run<T>(
    request: Observable<T>,
    done: () => void,
    success: (result: T) => string,
    form: CategoryForm | null,
    failed?: (err: unknown) => void,
  ): void {
    this.clearMessages();
    request.pipe(finalize(done), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.successMessage.set(success(result));
        this.reload();
      },
      error: (err: unknown) => {
        this.actionErrors.set(form ? form.showErrors(err) : getManageErrorMessages(err));
        if (getApiErrorMessages(err).includes(PARENT_MISSING)) {
          this.reload();
        }
        failed?.(err);
      },
    });
  }

  private reload(): void {
    this.categories.reload();
    this.categoriesStore.reload();
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.actionErrors.set([]);
    this.deleteConflict.set(null);
  }
}
