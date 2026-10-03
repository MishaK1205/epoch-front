import {
  AfterContentInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  getValidationMessage,
  ValidationMessageOverrides,
} from '../../validators/validation-messages';
import { ControlState } from '../form-control/control-state';
import { Icon } from '../icon/icon';

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Styled native select for reactive forms:
 * `<app-select formControlName="categoryId" label="კატეგორია" [options]="[{ value, label }]" />`.
 * `hideLabel` keeps the label for screen readers only (inline table usage).
 */
@Component({
  selector: 'app-select',
  imports: [Icon],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly label = input.required<string>();
  readonly options = input<readonly SelectOption[]>([]);
  readonly placeholder = input('');
  readonly hint = input('');
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly errorMessages = input<ValidationMessageOverrides>({});
  /** Emits the new value when the user picks an option (not on `writeValue`). */
  readonly selectionChange = output<string>();

  protected readonly id = `app-select-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly required = this.controlState.required;

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

  protected onSelect(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
