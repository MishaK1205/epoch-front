import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { WhatWhereWhenApi } from '../../../../core/api/what-where-when/what-where-when-api';
import { CalendarDatePipe } from '../../../../shared/pipes/calendar-date-pipe';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { WwwQuestionList } from '../../../../shared/ui/www-question-list/www-question-list';
import { getManageErrorMessages } from '../../manage-errors';
import {
  WWW_PACKAGE_CREATED_STATE_KEY,
  WWW_PACKAGE_DELETED_STATE_KEY,
  WWW_PACKAGES_URL,
  wwwPackageDeleteMessage,
} from '../../manage-labels';

const LIST_URL = WWW_PACKAGES_URL;

function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 404;
}

/** `/manage/what-where-when/:id` — read-only preview of a package (admin only). */
@Component({
  selector: 'app-www-package-view',
  imports: [
    RouterLink,
    CalendarDatePipe,
    TimeAgoPipe,
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    Icon,
    Spinner,
    WwwQuestionList,
  ],
  templateUrl: './www-package-view.html',
  styleUrl: './www-package-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwPackageView {
  private readonly api = inject(WhatWhereWhenApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  readonly id = input.required<string>();

  protected readonly listUrl = LIST_URL;
  protected readonly pkg = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.get(id),
  });
  protected readonly notFound = computed(() => isNotFound(this.pkg.error()));
  protected readonly loadErrors = computed(() =>
    this.pkg.error() && !this.notFound() ? getManageErrorMessages(this.pkg.error()) : [],
  );
  protected readonly authors = computed(() =>
    this.pkg.hasValue() ? this.pkg.value().authors.join(', ') : '',
  );
  protected readonly deleteMessage = computed(() =>
    wwwPackageDeleteMessage(this.pkg.hasValue() ? this.pkg.value().name : ''),
  );

  protected readonly deleting = signal(false);
  protected readonly actionErrors = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.router.currentNavigation()?.extras.state?.[WWW_PACKAGE_CREATED_STATE_KEY] === true
      ? 'პაკეტი შეიქმნა.'
      : '',
  );

  protected retry(): void {
    this.pkg.reload();
  }

  protected askDelete(): void {
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.actionErrors.set([]);
    this.successMessage.set('');
    this.api
      .delete(this.id())
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.backToList(),
        error: (err: unknown) => {
          if (isNotFound(err)) {
            this.backToList();
          } else {
            this.actionErrors.set(getManageErrorMessages(err));
          }
        },
      });
  }

  private backToList(): void {
    void this.router.navigate([LIST_URL], { state: { [WWW_PACKAGE_DELETED_STATE_KEY]: true } });
  }
}
