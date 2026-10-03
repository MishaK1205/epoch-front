import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type AlertVariant = 'error' | 'success' | 'info';

const ICONS: Record<AlertVariant, IconName> = {
  error: 'alert-circle',
  success: 'check-circle',
  info: 'alert-circle',
};

/** Inline message box: `<app-alert variant="error">…</app-alert>`. */
@Component({
  selector: 'app-alert',
  imports: [Icon],
  template: `
    <app-icon class="alert__icon" [name]="icon()" />
    <div class="alert__content"><ng-content /></div>
  `,
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"alert--" + variant()',
    '[attr.role]': 'variant() === "error" ? "alert" : "status"',
  },
})
export class Alert {
  readonly variant = input<AlertVariant>('info');

  protected readonly icon = computed(() => ICONS[this.variant()]);
}
