import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/**
 * Mirrors a form control's errors / touched / required state into signals, so OnPush form
 * components in this zoneless app re-render when the parent form changes (e.g. `markAllAsTouched`).
 */
export class ControlState {
  private readonly _errors = signal<ValidationErrors | null>(null);
  private readonly _touched = signal(false);
  private readonly _required = signal(false);

  readonly errors = this._errors.asReadonly();
  readonly touched = this._touched.asReadonly();
  readonly required = this._required.asReadonly();

  /** Call from `ngAfterContentInit` (the control isn't attached before that). */
  connect(control: AbstractControl | null | undefined, destroyRef: DestroyRef): void {
    if (!control) {
      return;
    }
    const sync = (): void => {
      this._errors.set(control.errors);
      this._touched.set(control.touched);
      this._required.set(
        control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue),
      );
    };
    sync();
    control.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(sync);
  }
}
