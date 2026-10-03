import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-spinner',
  template: `<span class="visually-hidden">{{ label() }}</span>`,
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    '[class]': '"spinner--" + size()',
  },
})
export class Spinner {
  readonly size = input<SpinnerSize>('md');
  readonly label = input('იტვირთება…');
}
