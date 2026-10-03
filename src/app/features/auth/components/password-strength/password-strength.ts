import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { API_LIMITS } from '../../../../core/api/api-limits';

/** 0 = empty, 1 = weak … 4 = strong. */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

const LABELS: Record<PasswordStrengthScore, string> = {
  0: '',
  1: 'სუსტი',
  2: 'საშუალო',
  3: 'კარგი',
  4: 'ძლიერი',
};

/**
 * Scores a password with the server rules (`API_LIMITS.password`) plus length and character
 * variety. Meeting the server minimum (length + letter + digit) gives at least "საშუალო".
 */
export function scorePassword(password: string): PasswordStrengthScore {
  if (password.length === 0) {
    return 0;
  }
  const { min, pattern } = API_LIMITS.password;
  let score = 0;
  if (password.length >= min) {
    score++;
  }
  if (pattern.test(password)) {
    score++;
  }
  if (password.length >= min + 4) {
    score++;
  }
  if (/[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) {
    score++;
  }
  return Math.max(1, score) as PasswordStrengthScore;
}

/** Four-segment strength meter: `<app-password-strength [password]="password()" />`. */
@Component({
  selector: 'app-password-strength',
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[class]': '"strength--" + score()',
  },
})
export class PasswordStrength {
  readonly password = input.required<string>();

  protected readonly segments = [1, 2, 3, 4];
  protected readonly score = computed(() => scorePassword(this.password()));
  protected readonly label = computed(() => LABELS[this.score()]);
}
