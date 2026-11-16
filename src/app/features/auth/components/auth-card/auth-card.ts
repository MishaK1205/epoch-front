import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AuthBrand } from '../auth-brand/auth-brand';

/**
 * Login page shell in the editorial palette: paper brand panel and the form.
 * The panel hides below `lg`; the wordmark stays above the card.
 */
@Component({
  selector: 'app-auth-card',
  imports: [AuthBrand],
  templateUrl: './auth-card.html',
  styleUrl: './auth-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCard {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
