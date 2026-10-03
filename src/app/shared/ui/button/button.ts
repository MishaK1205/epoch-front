import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Spinner } from '../spinner/spinner';

export type ButtonVariant =
  'primary' | 'accent' | 'outline' | 'ghost' | 'inverse' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Styles a native `<button>` or `<a>`: `<button appButton variant="accent">…</button>`.
 * Set `[disabled]` yourself on buttons; `loading` shows a spinner and blocks clicks while the
 * button keeps its width. Icons: `<app-icon btnIconStart … />` / `<app-icon btnIconEnd … />`.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  imports: [Spinner],
  template: `
    <span class="btn__content">
      <ng-content select="[btnIconStart]" />
      <ng-content />
      <ng-content select="[btnIconEnd]" />
    </span>
    @if (loading()) {
      <app-spinner class="btn__spinner" size="sm" label="" />
    }
  `,
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class]': '"btn--" + variant() + " btn--" + size()',
    '[class.btn--full]': 'fullWidth()',
    '[class.btn--pill]': 'pill()',
    '[class.btn--loading]': 'loading()',
    '[attr.aria-busy]': 'loading() || null',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly fullWidth = input(false, { transform: booleanAttribute });
  /** Fully rounded (pill) shape instead of the default control radius. */
  readonly pill = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
}
