import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  getValidationMessage,
  ValidationMessageOverrides,
} from '../../validators/validation-messages';
import { ControlState } from '../form-control/control-state';
import { Icon } from '../icon/icon';

export type InputFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

let nextId = 0;

/**
 * Labeled text input for reactive forms: `<app-input-field formControlName="email" label="ელ-ფოსტა" />`.
 * Shows the validation message of the bound control once it's touched; `type="password"` gets a
 * show/hide toggle.
 */
@Component({
  selector: 'app-input-field',
  imports: [Icon],
  templateUrl: './input-field.html',
  styleUrl: './input-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputField implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly label = input.required<string>();
  readonly type = input<InputFieldType>('text');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly hint = input('');
  readonly maxlength = input<number | null>(null);
  readonly errorMessages = input<ValidationMessageOverrides>({});

  protected readonly id = `app-input-field-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly required = this.controlState.required;

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.passwordVisible() ? 'text' : this.type(),
  );
  protected readonly errorMessage = computed(() =>
    this.controlState.touched()
      ? getValidationMessage(this.controlState.errors(), this.errorMessages())
      : null,
  );
  protected readonly describedBy = computed(() => {
    if (this.errorMessage()) {
      return this.errorId;
    }
    return this.hint() ? this.hintId : null;
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngAfterContentInit(): void {
    this.controlState.connect(this.ngControl?.control, this.destroyRef);
  }

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }
}
