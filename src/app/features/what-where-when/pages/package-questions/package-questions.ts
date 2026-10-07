import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { getApiErrorMessages, WhatWhereWhenApi } from '../../../../core/api';
import { Seo } from '../../../../core/services/seo';
import { CalendarDatePipe } from '../../../../shared/pipes/calendar-date-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { WwwQuestionList } from '../../../../shared/ui/www-question-list/www-question-list';

/** `/what-where-when/:id` — a package's questions; answers stay collapsed until opened. */
@Component({
  selector: 'app-package-questions',
  imports: [
    RouterLink,
    CalendarDatePipe,
    Alert,
    Button,
    EmptyState,
    Icon,
    Spinner,
    WwwQuestionList,
  ],
  templateUrl: './package-questions.html',
  styleUrl: './package-questions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageQuestions {
  private readonly api = inject(WhatWhereWhenApi);
  private readonly seo = inject(Seo);

  readonly id = input.required<string>();

  protected readonly pkg = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.get(id),
  });
  protected readonly notFound = computed(() => {
    const err = this.pkg.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });
  protected readonly loadErrors = computed(() =>
    this.pkg.error() && !this.notFound() ? getApiErrorMessages(this.pkg.error()) : [],
  );
  protected readonly authors = computed(() =>
    this.pkg.hasValue() ? this.pkg.value().authors.join(', ') : '',
  );

  constructor() {
    effect(() => {
      if (this.pkg.hasValue()) {
        this.seo.update({ title: `${this.pkg.value().name} — რა? სად? როდის? — Epoch` });
      }
    });
  }

  protected retry(): void {
    this.pkg.reload();
  }
}
