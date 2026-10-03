import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'neutral' | 'success' | 'accent' | 'info';

/** Small status/role label: `<app-badge variant="success">გამოქვეყნებული</app-badge>`. */
@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"badge badge--" + variant()' },
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
}
