import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  template: `<a class="logo" routerLink="/" aria-label="Epoch — მთავარი">Epoch</a>`,
  styleUrl: './logo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.logo--inverse]': 'inverse()' },
})
export class Logo {
  readonly inverse = input(false, { transform: booleanAttribute });
}
