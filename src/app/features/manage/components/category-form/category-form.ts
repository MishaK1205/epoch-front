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
import { Category } from '../../../../core/api/categories/categories.models';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';

export interface CategoryFormValue {
  name: string;
  description: string;
}

/** Create (no `category`) or edit (`[category]`) form. Emits trimmed values. */
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, Button, Icon, InputField, TextareaField],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm implements OnInit {
  readonly category = input<Category | null>(null);
  readonly pending = input(false, { transform: booleanAttribute });
  readonly submitted = output<CategoryFormValue>();
  readonly cancelled = output<void>();

  protected readonly limits = API_LIMITS;
  protected readonly editing = computed(() => this.category() !== null);
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
  });

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.reset({ name: category.name, description: category.description ?? '' });
    }
  }

  /** Clears the form (after a successful create). */
  reset(): void {
    this.form.reset();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.getRawValue();
    this.submitted.emit({ name: name.trim(), description: description.trim() });
  }
}
