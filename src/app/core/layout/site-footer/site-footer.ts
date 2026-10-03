import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriesStore } from '../../services/categories-store';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Logo],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  protected readonly categories = inject(CategoriesStore).categories;
  protected readonly year = new Date().getFullYear();
}
