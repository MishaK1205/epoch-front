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
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { QuizCategoriesApi } from '../../../../core/api/quizzes/quiz-categories-api';
import { QuizCategoryBase } from '../../../../core/api/quizzes/quizzes.models';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import {
  QuizCategoryForm,
  QuizCategoryFormValue,
} from '../../components/quiz-category-form/quiz-category-form';
import {
  toCreateQuizCategoryRequest,
  toUpdateQuizCategoryRequest,
} from '../../components/quiz-category-form/quiz-category-request';
import { getManageErrorMessages } from '../../manage-errors';
import { QUIZZES_URL } from '../../manage-labels';

type FormMode =
  | { kind: 'create-category' }
  | { kind: 'create-subcategory' }
  | { kind: 'edit'; category: QuizCategoryBase };

interface DeleteBlock {
  messages: string[];
  /** Set when the category still has quizzes, so the alert can link to them. */
  quizzesQuery: { categoryId: string } | null;
}

const GONE_MESSAGE = 'კატეგორია უკვე წაშლილი იყო. სია განახლდა.';

function errorStatus(err: unknown): number | null {
  return err instanceof HttpErrorResponse ? err.status : null;
}

function quizzesQueryFor(category: QuizCategoryBase): { categoryId: string } {
  return { categoryId: category.id };
}

/**
 * `/manage/quizzes/categories` — create, rename and delete quiz categories.
 * A subcategory's parent is chosen only on create.
 */
@Component({
  selector: 'app-quiz-categories',
  imports: [RouterLink, Alert, Button, ConfirmDialog, EmptyState, Icon, Spinner, QuizCategoryForm],
  templateUrl: './quiz-categories.html',
  styleUrls: ['../../manage-page.scss', './quiz-categories.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizCategories {
  private readonly api = inject(QuizCategoriesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly quizzesUrl = QUIZZES_URL;
  protected readonly categories = rxResource({ stream: () => this.api.list() });
  protected readonly items = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly loadErrors = computed(() =>
    this.categories.error() ? getManageErrorMessages(this.categories.error()) : [],
  );

  protected readonly formMode = signal<FormMode | null>(null);
  protected readonly creatingCategory = computed(() => this.formMode()?.kind === 'create-category');
  protected readonly creatingSubcategory = computed(
    () => this.formMode()?.kind === 'create-subcategory',
  );
  protected readonly editingId = computed(() => {
    const mode = this.formMode();
    return mode?.kind === 'edit' ? mode.category.id : null;
  });
  protected readonly pendingId = signal<string | null>(null);
  protected readonly toDelete = signal<QuizCategoryBase | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly deleteBlock = signal<DeleteBlock | null>(null);
  protected readonly deleteMessage = computed(
    () => `კატეგორია „${this.toDelete()?.name ?? ''}“ სამუდამოდ წაიშლება.`,
  );

  protected retry(): void {
    this.categories.reload();
  }

  protected openCreateCategory(): void {
    this.clearMessages();
    this.formMode.set({ kind: 'create-category' });
  }

  protected openCreateSubcategory(): void {
    this.clearMessages();
    this.formMode.set({ kind: 'create-subcategory' });
  }

  protected startEdit(category: QuizCategoryBase): void {
    this.clearMessages();
    this.formMode.set({ kind: 'edit', category });
  }

  protected closeForm(): void {
    this.formMode.set(null);
  }

  protected create(value: QuizCategoryFormValue, form: QuizCategoryForm): void {
    this.run(
      'new',
      this.api.create(toCreateQuizCategoryRequest(value)),
      (category) => `კატეგორია „${category.name}“ დაემატა.`,
      (err) => this.actionErrors.set(form.showErrors(err)),
    );
  }

  protected update(
    category: QuizCategoryBase,
    value: QuizCategoryFormValue,
    form: QuizCategoryForm,
  ): void {
    const diff = toUpdateQuizCategoryRequest(category, value);
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

  /** Subcategories, then quizzes, block the request. The server's 409 is still handled. */
  protected askDeleteCategory(category: QuizCategoryBase, subcategoryCount: number): void {
    this.clearMessages();
    if (subcategoryCount > 0) {
      this.deleteBlock.set({
        messages: [`კატეგორიას აქვს ${subcategoryCount} ქვეკატეგორია. ჯერ ისინი წაშალეთ.`],
        quizzesQuery: null,
      });
      return;
    }
    if (category.quizCount > 0) {
      this.blockForQuizzes(category);
      return;
    }
    this.toDelete.set(category);
    this.deleteDialog().open();
  }

  protected askDeleteSubcategory(subcategory: QuizCategoryBase): void {
    this.clearMessages();
    if (subcategory.quizCount > 0) {
      this.blockForQuizzes(subcategory);
      return;
    }
    this.toDelete.set(subcategory);
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
      (err) => this.onDeleteError(category, err),
    );
  }

  private blockForQuizzes(category: QuizCategoryBase): void {
    this.deleteBlock.set({
      messages: [
        `„${category.name}“-ში ${category.quizCount} ქვიზია. ჯერ გადაიტანეთ ან წაშალეთ ისინი.`,
      ],
      quizzesQuery: quizzesQueryFor(category),
    });
  }

  private onDeleteError(category: QuizCategoryBase, err: unknown): void {
    const status = errorStatus(err);
    if (status === 409) {
      const raw = getApiErrorMessages(err);
      const aboutQuizzes = raw.some((message) => message.startsWith('Quiz category is used by'));
      this.deleteBlock.set({
        messages: getManageErrorMessages(err),
        quizzesQuery: aboutQuizzes ? quizzesQueryFor(category) : null,
      });
      this.categories.reload();
      return;
    }
    if (status === 404) {
      this.successMessage.set(GONE_MESSAGE);
      this.categories.reload();
      return;
    }
    this.actionErrors.set(getManageErrorMessages(err));
  }

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
    this.deleteBlock.set(null);
  }
}
