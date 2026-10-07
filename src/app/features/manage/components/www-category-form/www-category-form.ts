import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { WhatWhereWhenCategory } from '../../../../core/api/what-where-when/what-where-when.models';
import { notBlank } from '../../../../shared/validators/not-blank';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { applyManageErrors } from '../../manage-errors';

const LIMITS = API_LIMITS.whatWhereWhen;

export interface WwwCategoryFormValue {
  name: string;
  description: string;
}

type WwwCategoryField = keyof WwwCategoryFormValue;

/** Backend messages shown on a field instead of the page alert. */
const FIELD_ERRORS: Partial<Record<string, WwwCategoryField>> = {
  'A What? Where? When? category with this name already exists': 'name',
  'name must be longer than or equal to 1 characters': 'name',
  'name must be shorter than or equal to 100 characters': 'name',
  'description must be shorter than or equal to 500 characters': 'description',
};

/**
 * Create (no `category`) or edit (`[category]`) form for a "What? Where? When?" category. Emits
 * trimmed values; focuses the name field when it appears.
 */
@Component({
  selector: 'app-www-category-form',
  imports: [ReactiveFormsModule, Button, Icon, InputField, TextareaField],
  templateUrl: './www-category-form.html',
  styleUrl: './www-category-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwCategoryForm implements OnInit {
  readonly category = input<WhatWhereWhenCategory | null>(null);
  readonly pending = input(false);
  readonly submitted = output<WwwCategoryFormValue>();
  readonly cancelled = output<void>();

  protected readonly limits = LIMITS;
  protected readonly editing = computed(() => this.category() !== null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(LIMITS.categoryName.max)]],
    description: ['', Validators.maxLength(LIMITS.categoryDescription.max)],
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector('input')?.focus());
  }

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.reset({ name: category.name, description: category.description });
    }
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
    const { name, description } = this.form.getRawValue();
    this.submitted.emit({ name: name.trim(), description: description.trim() });
  }
}
