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

let nextId = 0;

/**
 * Checkbox for reactive forms; the label is projected content:
 * `<app-checkbox formControlName="terms">I agree</app-checkbox>`.
 */
@Component({
  selector: 'app-checkbox',
  imports: [Icon],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkbox implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly errorMessages = input<ValidationMessageOverrides>({});

  protected readonly errorId = `app-checkbox-${nextId++}-error`;
  protected readonly checked = signal(false);
  protected readonly disabled = signal(false);
  protected readonly required = this.controlState.required;
  protected readonly errorMessage = computed(() =>
    this.controlState.touched()
      ? getValidationMessage(this.controlState.errors(), this.errorMessages())
      : null,
  );

  private onChange: (value: boolean) => void = () => undefined;
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
    this.checked.set(value === true);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onToggle(checked: boolean): void {
    this.checked.set(checked);
    this.onChange(checked);
    this.onTouched();
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
