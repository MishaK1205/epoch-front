import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { CategoryBase, CategorySummary } from '../../../../core/api/categories/categories.models';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { applyManageErrors } from '../../manage-errors';

export interface CategoryFormValue {
  name: string;
  description: string;
  /** Create only: id of the top-level parent; `''` = top-level category. */
  parentId: string;
}

type CategoryField = 'name' | 'parentId';

/** Backend messages shown on a field instead of the page alert. */
const FIELD_ERRORS: Partial<Record<string, CategoryField>> = {
  'Parent category does not exist': 'parentId',
  'Subcategories cannot have their own subcategories': 'parentId',
  'Category name must contain letters or numbers': 'name',
  'A category with this name already exists': 'name',
};

/**
 * Create (no `category`) or edit (`[category]`) form. Emits trimmed values.
 * Create: Parent select from `[parents]` (top-level categories only), preselected with
 * `[parentId]`. Edit: name and description only; the parent is shown read-only.
 */
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, Button, Icon, InputField, Select, TextareaField],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm implements OnInit {
  readonly category = input<CategoryBase | null>(null);
  readonly parents = input<readonly CategorySummary[]>([]);
  readonly parentId = input('');
  readonly pending = input(false, { transform: booleanAttribute });
  /** Shows the cancel button in create mode too (edit mode always has it). */
  readonly cancellable = input(false, { transform: booleanAttribute });
  readonly submitted = output<CategoryFormValue>();
  readonly cancelled = output<void>();

  protected readonly limits = API_LIMITS;
  protected readonly editing = computed(() => this.category() !== null);
  protected readonly canCancel = computed(() => this.editing() || this.cancellable());
  protected readonly parentOptions = computed<SelectOption[]>(() =>
    this.parents().map((parent) => ({ value: parent.id, label: parent.name })),
  );
  protected readonly creatingSubcategory = computed(
    () => !this.editing() && this.parentId() !== '',
  );
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(API_LIMITS.categoryName.min),
        Validators.maxLength(API_LIMITS.categoryName.max),
      ],
    ],
    description: ['', Validators.maxLength(API_LIMITS.categoryDescription.max)],
    parentId: [''],
  });

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.reset({ name: category.name, description: category.description ?? '' });
    } else {
      this.form.reset({ parentId: this.parentId() });
    }
  }

  /** Clears the form (after a successful create); keeps the preselected parent. */
  reset(): void {
    this.form.reset({ parentId: this.parentId() });
  }

  /** Shows field-related API errors on the fields; returns the rest for the page alert. */
  showErrors(err: unknown): string[] {
    return applyManageErrors(err, FIELD_ERRORS, this.form.controls);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description, parentId } = this.form.getRawValue();
    this.submitted.emit({
      name: name.trim(),
      description: description.trim(),
      parentId: this.editing() ? '' : parentId,
    });
  }
}
