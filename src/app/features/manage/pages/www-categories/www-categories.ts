import { HttpErrorResponse } from '@angular/common/http';
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
import { WhatWhereWhenCategoriesApi } from '../../../../core/api/what-where-when/what-where-when-categories-api';
import { WhatWhereWhenCategory } from '../../../../core/api/what-where-when/what-where-when.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import {
  WwwCategoryForm,
  WwwCategoryFormValue,
} from '../../components/www-category-form/www-category-form';
import {
  toCreateWwwCategoryRequest,
  toUpdateWwwCategoryRequest,
} from '../../components/www-category-form/www-category-request';
import { getManageErrorMessages } from '../../manage-errors';
import { WWW_PACKAGES_URL } from '../../manage-labels';

type FormMode = { kind: 'create' } | { kind: 'edit'; id: string };

/** Delete is blocked because the category still has packages. */
interface DeleteConflict {
  category: WhatWhereWhenCategory;
  messages: string[];
}

const GONE_MESSAGE = 'კატეგორია უკვე წაშლილი იყო. სია განახლდა.';

function errorStatus(err: unknown): number | null {
  return err instanceof HttpErrorResponse ? err.status : null;
}

/**
 * `/manage/what-where-when/categories` (admin): flat list of package categories with their
 * package counts; create, edit and delete (only when the category has no packages).
 */
@Component({
  selector: 'app-www-categories',
  imports: [RouterLink, Alert, Button, ConfirmDialog, EmptyState, Icon, Spinner, WwwCategoryForm],
  templateUrl: './www-categories.html',
  styleUrls: ['../../manage-page.scss', './www-categories.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwCategories {
  private readonly api = inject(WhatWhereWhenCategoriesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly packagesUrl = WWW_PACKAGES_URL;
  protected readonly categories = rxResource({ stream: () => this.api.list() });
  protected readonly items = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly loadErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );

  protected readonly formMode = signal<FormMode | null>(null);
  protected readonly creatingOpen = computed(() => this.formMode()?.kind === 'create');
  protected readonly editingId = computed(() => {
    const mode = this.formMode();
    return mode?.kind === 'edit' ? mode.id : null;
  });
  /** Id of the category whose request is running, or `'new'` while creating. */
  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<WhatWhereWhenCategory | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly deleteConflict = signal<DeleteConflict | null>(null);
  protected readonly deleteMessage = computed(
    () => `კატეგორია „${this.toDelete()?.name ?? ''}“ სამუდამოდ წაიშლება.`,
  );

  protected retry(): void {
    this.categories.reload();
  }

  protected openCreate(): void {
    this.clearMessages();
    this.formMode.set({ kind: 'create' });
  }

  protected startEdit(category: WhatWhereWhenCategory): void {
    this.clearMessages();
    this.formMode.set({ kind: 'edit', id: category.id });
  }

  protected closeForm(): void {
    this.formMode.set(null);
  }

  protected create(value: WwwCategoryFormValue, form: WwwCategoryForm): void {
    this.run(
      'new',
      this.api.create(toCreateWwwCategoryRequest(value)),
      (category) => `კატეგორია „${category.name}“ დაემატა.`,
      (err) => this.actionErrors.set(form.showErrors(err)),
    );
  }

  protected update(
    category: WhatWhereWhenCategory,
    value: WwwCategoryFormValue,
    form: WwwCategoryForm,
  ): void {
    const diff = toUpdateWwwCategoryRequest(category, value);
    if (Object.keys(diff).length === 0) {
      this.closeForm();
      return;
    }
    this.run(
      category.id,
      this.api.update(category.id, diff),
      (updated) => `კატეგორია „${updated.name}“ განახლდა.`,
      (err) => {
        if (errorStatus(err) === 404) {
          this.closeForm();
          this.actionErrors.set([GONE_MESSAGE]);
          this.categories.reload();
        } else {
          this.actionErrors.set(form.showErrors(err));
        }
      },
    );
  }

  /** Categories with packages are never sent to the API: the server would answer 409. */
  protected askDelete(category: WhatWhereWhenCategory): void {
    this.clearMessages();
    if (category.packageCount > 0) {
      this.deleteConflict.set({
        category,
        messages: [
          `კატეგორიაში „${category.name}“ ${category.packageCount} პაკეტია. ჯერ გადაიტანეთ ისინი სხვა კატეგორიაში.`,
        ],
      });
      return;
    }
    this.toDelete.set(category);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const category = this.toDelete();
    if (!category || this.pendingId()) {
      return;
    }
    this.run(
      category.id,
      this.api.delete(category.id),
      () => `კატეგორია „${category.name}“ წაიშალა.`,
      (err) => {
        const status = errorStatus(err);
        if (status === 409) {
          this.deleteConflict.set({ category, messages: getManageErrorMessages(err) });
        } else if (status === 404) {
          this.successMessage.set(GONE_MESSAGE);
        } else {
          this.actionErrors.set(getManageErrorMessages(err));
          return;
        }
        this.categories.reload();
      },
    );
  }

  /** Runs a mutation; on success closes the form, shows `success` and reloads the list. */
  private run<T>(
    pendingId: string,
    request: Observable<T>,
    success: (result: T) => string,
    failed: (err: unknown) => void,
  ): void {
    if (this.pendingId()) {
      return;
    }
    this.clearMessages();
    this.pendingId.set(pendingId);
    request
      .pipe(
        finalize(() => this.pendingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.closeForm();
          this.successMessage.set(success(result));
          this.categories.reload();
        },
        error: failed,
      });
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.actionErrors.set([]);
    this.deleteConflict.set(null);
  }
}
