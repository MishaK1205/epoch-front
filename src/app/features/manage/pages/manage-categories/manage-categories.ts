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
import { finalize, Observable } from 'rxjs';
import { CategoriesApi } from '../../../../core/api/categories/categories-api';
import { Category, UpdateCategoryRequest } from '../../../../core/api/categories/categories.models';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { CategoryForm, CategoryFormValue } from '../../components/category-form/category-form';
import { getManageErrorMessages } from '../../manage-errors';

/** `/manage/categories` (admin): create, rename / describe and delete categories. */
@Component({
  selector: 'app-manage-categories',
  imports: [Alert, Badge, Button, ConfirmDialog, EmptyState, Icon, Spinner, CategoryForm],
  templateUrl: './manage-categories.html',
  styleUrls: ['../../manage-page.scss', './manage-categories.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCategories {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly createForm = viewChild.required<CategoryForm>('createForm');
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly categories = rxResource({ stream: () => this.categoriesApi.list() });
  protected readonly creating = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<Category | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);

  protected readonly items = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly loadErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );
  protected readonly deleteMessage = computed(
    () => `კატეგორია „${this.toDelete()?.name ?? ''}“ სამუდამოდ წაიშლება.`,
  );

  protected create(value: CategoryFormValue): void {
    this.creating.set(true);
    const body = value.description ? value : { name: value.name };
    this.run(
      this.categoriesApi.create(body),
      () => this.creating.set(false),
      (category) => {
        this.createForm().reset();
        return `კატეგორია „${category.name}“ დაემატა.`;
      },
    );
  }

  protected startEdit(category: Category): void {
    this.clearMessages();
    this.editingId.set(category.id);
  }

  protected update(category: Category, value: CategoryFormValue): void {
    const diff: UpdateCategoryRequest = {};
    if (value.name !== category.name) {
      diff.name = value.name;
    }
    if (value.description !== (category.description ?? '')) {
      diff.description = value.description;
    }
    if (Object.keys(diff).length === 0) {
      this.editingId.set(null);
      return;
    }
    this.pendingId.set(category.id);
    this.run(
      this.categoriesApi.update(category.id, diff),
      () => this.pendingId.set(null),
      (updated) => {
        this.editingId.set(null);
        return `კატეგორია „${updated.name}“ განახლდა.`;
      },
    );
  }

  protected askDelete(category: Category): void {
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
      () => `კატეგორია „${category.name}“ წაიშალა.`,
    );
  }

  /** Runs a mutation, then reloads this list and the app-wide `CategoriesStore`. */
  private run<T>(request: Observable<T>, done: () => void, success: (result: T) => string): void {
    this.clearMessages();
    request.pipe(finalize(done), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.successMessage.set(success(result));
        this.categories.reload();
        this.categoriesStore.reload();
      },
      error: (err: unknown) => this.actionErrors.set(getManageErrorMessages(err)),
    });
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.actionErrors.set([]);
  }
}
