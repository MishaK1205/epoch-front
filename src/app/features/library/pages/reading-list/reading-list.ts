import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { ReadingListApi } from '../../../../core/api/reading-list/reading-list-api';
import {
  ReadingListKind,
  ReadingListToggle,
} from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { toPage } from '../../../../shared/utils/page-param';

const PAGE_SIZE = 12;

interface ListCopy {
  title: string;
  addedLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

const COPY: Record<ReadingListKind, ListCopy> = {
  saved: {
    title: 'შენახული სტატიები',
    addedLabel: 'შენახულია',
    emptyTitle: 'შენახული სტატიები არ გაქვთ',
    emptyDescription:
      'დააჭირეთ სანიშნეს სტატიის ბარათზე ან სტატიის გვერდზე, რომ მოგვიანებით წასაკითხად შეინახოთ.',
  },
  read: {
    title: 'წაკითხული სტატიები',
    addedLabel: 'წაკითხულია',
    emptyTitle: 'წაკითხული სტატიები არ გაქვთ',
    emptyDescription:
      'სტატიის ბოლოს მონიშნეთ ის წაკითხულად — ყველა წაკითხული სტატია აქ შეგროვდება.',
  },
};

/**
 * The user's saved (`/me/saved`) or read (`/me/read`) list; `kind` comes from route data.
 * Removing an item drops it from the page at once (the store updates optimistically).
 */
@Component({
  selector: 'app-reading-list',
  imports: [
    RouterLink,
    RouterLinkActive,
    TimeAgoPipe,
    Alert,
    ArticleCard,
    Button,
    EmptyState,
    Icon,
    Pagination,
    Spinner,
    ReadingListToggle,
  ],
  templateUrl: './reading-list.html',
  styleUrl: './reading-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingList {
  private readonly api = inject(ReadingListApi);
  private readonly store = inject(ReadingListStore);
  private readonly router = inject(Router);

  readonly kind = input.required<ReadingListKind>();
  readonly page = input(1, { transform: toPage });

  protected readonly copy = computed(() => COPY[this.kind()]);
  protected readonly isSavedList = computed(() => this.kind() === 'saved');

  protected readonly list = rxResource({
    params: () => ({ kind: this.kind(), page: this.page() }),
    stream: ({ params }) => {
      const query = { page: params.page, limit: PAGE_SIZE };
      return params.kind === 'saved' ? this.api.listSaved(query) : this.api.listRead(query);
    },
  });

  private readonly pageItems = computed(() =>
    this.list.hasValue() ? this.list.value().items : [],
  );
  private readonly memberIds = computed(() =>
    this.kind() === 'saved' ? this.store.savedIds() : this.store.readIds(),
  );
  /** Items still in the list — removed ones disappear without a refetch. */
  protected readonly items = computed(() => {
    const ids = this.memberIds();
    return this.pageItems().filter((item) => ids.has(item.article.id));
  });
  protected readonly total = computed(() => {
    if (!this.list.hasValue()) {
      return 0;
    }
    const removed = this.pageItems().length - this.items().length;
    return Math.max(this.list.value().total - removed, 0);
  });
  protected readonly totalPages = computed(() => Math.ceil(this.total() / PAGE_SIZE));
  protected readonly readIds = this.store.readIds;
  protected readonly errorMessages = computed(() =>
    this.list.error() ? getApiErrorMessages(this.list.error()) : [],
  );

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }

  /** After the last item on a page is removed, go back a page or pull the next page forward. */
  protected onMembershipChanged(active: boolean): void {
    if (active || this.items().length > 0) {
      return;
    }
    if (this.page() > 1) {
      this.goToPage(this.page() - 1);
    } else if (this.total() > 0) {
      this.list.reload();
    }
  }
}
