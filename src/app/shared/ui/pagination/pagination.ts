import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

type PageItem = { kind: 'page'; key: string; page: number } | { kind: 'gap'; key: string };

/** Page navigation: `<app-pagination [page]="page" [totalPages]="10" (pageChange)="go($event)" />`. */
@Component({
  selector: 'app-pagination',
  imports: [Icon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly items = computed<PageItem[]>(() => {
    const current = this.page();
    const total = this.totalPages();
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

    const items: PageItem[] = [];
    sorted.forEach((page, index) => {
      const previous = sorted[index - 1];
      if (previous !== undefined && page - previous > 1) {
        items.push({ kind: 'gap', key: `gap-${previous}` });
      }
      items.push({ kind: 'page', key: `page-${page}`, page });
    });
    return items;
  });

  protected select(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }
}
