import {
  AfterContentInit,
  booleanAttribute,
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
 * Labeled multi-line input for reactive forms:
 * `<app-textarea-field formControlName="description" label="აღწერა" [maxlength]="500" showCount />`.
 */
@Component({
  selector: 'app-textarea-field',
  imports: [Icon],
  templateUrl: './textarea-field.html',
  styleUrl: './textarea-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaField implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly hint = input('');
  readonly rows = input(4);
  readonly maxlength = input<number | null>(null);
  /** Shows an `n / max` character counter (needs `maxlength`). */
  readonly showCount = input(false, { transform: booleanAttribute });
  readonly errorMessages = input<ValidationMessageOverrides>({});

  protected readonly id = `app-textarea-field-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly countId = `${this.id}-count`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly required = this.controlState.required;

  protected readonly errorMessage = computed(() =>
    this.controlState.touched()
      ? getValidationMessage(this.controlState.errors(), this.errorMessages())
      : null,
  );
  protected readonly counterVisible = computed(() => this.showCount() && this.maxlength() !== null);
  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.errorMessage()) {
      ids.push(this.errorId);
    } else if (this.hint()) {
      ids.push(this.hintId);
    }
    if (this.counterVisible()) {
      ids.push(this.countId);
    }
    return ids.length > 0 ? ids.join(' ') : null;
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
}
