import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'menu'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'user'
  | 'log-out'
  | 'chevron-left'
  | 'chevron-right'
  | 'alert-circle'
  | 'check-circle'
  | 'check'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'upload'
  | 'image'
  | 'chevron-down'
  | 'external-link'
  | 'settings'
  | 'search'
  | 'bookmark'
  | 'book-open'
  | 'help-circle';

/** Inline SVG icon. Inherits `color` from its parent. Decorative (aria-hidden). */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
