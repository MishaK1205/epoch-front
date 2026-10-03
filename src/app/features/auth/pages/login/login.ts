import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { AuthService } from '../../../../core/auth/auth-service';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { getAuthErrorMessages, safeReturnUrl } from '../../auth-errors';
import { AuthCard } from '../../components/auth-card/auth-card';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, InputField, AuthCard],
  templateUrl: './login.html',
  styleUrl: '../../auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly returnUrl = input<string>();

  protected readonly limits = API_LIMITS;
  protected readonly form = inject(NonNullableFormBuilder).group({
    identifier: ['', [Validators.required, Validators.maxLength(API_LIMITS.loginIdentifier.max)]],
    password: ['', [Validators.required, Validators.maxLength(API_LIMITS.password.max)]],
  });
  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverErrors.set([]);
    this.submitting.set(true);
    this.auth
      .login(this.form.getRawValue())
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
