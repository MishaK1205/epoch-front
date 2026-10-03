import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Button],
  template: `
    <p class="not-found__code">404</p>
    <h1 class="not-found__title">გვერდი ვერ მოიძებნა</h1>
    <p class="not-found__text">ასეთი გვერდი არ არსებობს ან წაშლილია.</p>
    <a appButton routerLink="/">მთავარზე დაბრუნება</a>
  `,
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
