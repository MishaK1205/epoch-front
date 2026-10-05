import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../api/categories/categories.models';
import { Icon } from '../../../shared/ui/icon/icon';

/**
 * Category list of the site drawer. A category with subcategories gets a toggle button that
 * expands / collapses them; the category name itself stays a link.
 */
@Component({
  selector: 'app-drawer-categories',
  imports: [RouterLink, Icon],
  templateUrl: './drawer-categories.html',
  styleUrl: './drawer-categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerCategories {
  readonly categories = input.required<readonly Category[]>();

  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  protected toggle(id: string): void {
    this.expandedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }
}
