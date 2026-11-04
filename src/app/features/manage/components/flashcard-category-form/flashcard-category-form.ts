import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import {
  FlashcardCategoryBase,
  FlashcardCategorySummary,
} from '../../../../core/api/flashcards/flashcards.models';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { notBlank } from '../../../../shared/validators/not-blank';
import { applyManageErrors } from '../../manage-errors';

const LIMITS = API_LIMITS.flashcard;

export interface FlashcardCategoryFormValue {
  name: string;
  description: string;
  /** Create-subcategory only. `''` on a top-level category and on edit. */
  parentId: string;
}

type CategoryField = 'name' | 'description' | 'parentId';

/** Backend messages shown on a field instead of the page alert. */
const FIELD_ERRORS: Partial<Record<string, CategoryField>> = {
  'A flashcard category with this name already exists': 'name',
  'Flashcard category name must contain letters or numbers': 'name',
  'name must be longer than or equal to 2 characters': 'name',
  'name must be shorter than or equal to 50 characters': 'name',
  'description must be shorter than or equal to 500 characters': 'description',
  'Parent flashcard category does not exist': 'parentId',
  'Subcategories cannot have their own subcategories': 'parentId',
};

/**
 * Create a category (`requireParent` false), create a subcategory (`requireParent` true),
 * or edit (`category` set — no parent control; the parent cannot be changed).
 */
@Component({
  selector: 'app-flashcard-category-form',
  imports: [ReactiveFormsModule, Button, Icon, InputField, Select, TextareaField],
  templateUrl: './flashcard-category-form.html',
  styleUrl: './flashcard-category-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardCategoryForm implements OnInit {
  readonly category = input<FlashcardCategoryBase | null>(null);
  readonly parents = input<readonly FlashcardCategorySummary[]>([]);
  readonly requireParent = input(false, { transform: booleanAttribute });
  readonly pending = input(false, { transform: booleanAttribute });
  readonly submitted = output<FlashcardCategoryFormValue>();
  readonly cancelled = output<void>();

  protected readonly limits = LIMITS;
  protected readonly editing = computed(() => this.category() !== null);
  protected readonly parentOptions = computed<SelectOption[]>(() =>
    this.parents().map((parent) => ({ value: parent.id, label: parent.name })),
  );
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      [
        Validators.required,
        notBlank,
        Validators.minLength(LIMITS.categoryName.min),
        Validators.maxLength(LIMITS.categoryName.max),
      ],
    ],
    description: ['', Validators.maxLength(LIMITS.categoryDescription.max)],
    parentId: ['', (control: AbstractControl) => this.parentRequired(control)],
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector('input')?.focus());
  }

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.reset({ name: category.name, description: category.description ?? '' });
    }
  }

  /** Shows field-related API errors on the fields; returns the rest for the page alert. */
  showErrors(err: unknown): string[] {
    return applyManageErrors(err, FIELD_ERRORS, this.form.controls);
  }

  protected submit(): void {
    this.form.controls.parentId.updateValueAndValidity();
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

  /** Required only while creating a subcategory. Inputs are not bound yet at construction. */
  private parentRequired(control: AbstractControl): ValidationErrors | null {
    if (this.editing() || !this.requireParent()) {
      return null;
    }
    const value: unknown = control.value;
    return typeof value === 'string' && value !== '' ? null : { required: true };
  }
}
