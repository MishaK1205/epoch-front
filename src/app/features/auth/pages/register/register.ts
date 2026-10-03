import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { AuthService } from '../../../../core/auth/auth-service';
import { matchesControl } from '../../../../shared/validators/matches-control';
import { ValidationMessageOverrides } from '../../../../shared/validators/validation-messages';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { getAuthErrorMessages, safeReturnUrl } from '../../auth-errors';
import { AuthCard } from '../../components/auth-card/auth-card';
import { PasswordStrength } from '../../components/password-strength/password-strength';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Alert,
    Button,
    Checkbox,
    InputField,
    AuthCard,
    PasswordStrength,
  ],
  templateUrl: './register.html',
  styleUrl: '../../auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly returnUrl = input<string>();

  protected readonly limits = API_LIMITS;
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(API_LIMITS.username.min),
        Validators.maxLength(API_LIMITS.username.max),
        Validators.pattern(API_LIMITS.username.pattern),
      ],
    ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(API_LIMITS.email.max)],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(API_LIMITS.password.min),
        Validators.maxLength(API_LIMITS.password.max),
        Validators.pattern(API_LIMITS.password.pattern),
      ],
    ],
    confirmPassword: ['', [Validators.required, matchesControl('password')]],
    acceptTerms: [false, Validators.requiredTrue],
  });
  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected readonly usernameMessages: ValidationMessageOverrides = {
    pattern: 'გამოიყენეთ მხოლოდ ლათინური ასოები, ციფრები, „_“ და „.“.',
  };
  protected readonly passwordMessages: ValidationMessageOverrides = {
    pattern: 'პაროლი უნდა შეიცავდეს მინიმუმ ერთ ასოს და ერთ ციფრს.',
  };
  protected readonly confirmPasswordMessages: ValidationMessageOverrides = {
    mismatch: 'პაროლები არ ემთხვევა.',
  };
  protected readonly termsMessages: ValidationMessageOverrides = {
    required: 'გასაგრძელებლად დაეთანხმეთ წესებს.',
  };

  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, email, password } = this.form.getRawValue();
    this.serverErrors.set([]);
    this.submitting.set(true);
    this.auth
      .register({ username, email, password })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
        error: (err: unknown) => this.serverErrors.set(getAuthErrorMessages(err)),
      });
  }
}
