import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * Placeholder for empty lists / missing content; the action is projected:
 * `<app-empty-state icon="image" title="…" description="…"><a appButton>…</a></app-empty-state>`.
 */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `title` is an input; keep the static attribute from becoming a native tooltip.
  host: { '[attr.title]': 'null' },
})
export class EmptyState {
  readonly icon = input<IconName | null>(null);
  readonly title = input.required<string>();
  readonly description = input('');
}
