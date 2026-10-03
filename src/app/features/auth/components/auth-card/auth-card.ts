import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AuthBrand } from '../auth-brand/auth-brand';

/**
 * Page shell for the login and register pages: brand panel + centered card.
 * Split screen on ≥1024px; on smaller screens only the card with a compact brand eyebrow.
 * Content: the form; `[authCardFooter]` slot: links below the card.
 */
@Component({
  selector: 'app-auth-card',
  imports: [AuthBrand],
  template: `
    <div class="auth">
      <app-auth-brand class="auth__brand" />

      <div class="auth__main">
        <div class="auth__panel">
          <p class="auth__eyebrow">Epoch</p>

          <section class="auth-card">
            <header class="auth-card__header">
              <h1 class="auth-card__title">{{ title() }}</h1>
              @if (subtitle()) {
                <p class="auth-card__subtitle">{{ subtitle() }}</p>
              }
            </header>
            <ng-content />
          </section>

          <div class="auth-card__footer"><ng-content select="[authCardFooter]" /></div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './auth-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCard {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
