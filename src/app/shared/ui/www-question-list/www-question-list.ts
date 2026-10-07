import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WhatWhereWhenQuestion } from '../../../core/api/what-where-when/what-where-when.models';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

interface QuestionView {
  number: number;
  html: SafeHtml;
  answer: string;
  comment: string;
}

let nextListId = 0;

/**
 * Numbered "რა? სად? როდის?" questions. Every answer (with its comment) starts collapsed and is
 * opened per question or all at once; a new question list collapses them again.
 */
@Component({
  selector: 'app-www-question-list',
  imports: [Button, Icon],
  templateUrl: './www-question-list.html',
  styleUrl: './www-question-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwQuestionList {
  private readonly sanitizer = inject(DomSanitizer);

  readonly questions = input.required<readonly WhatWhereWhenQuestion[]>();

  protected readonly idPrefix = `www-q-${nextListId++}-`;
  /**
   * The API sanitizes question HTML (same allowlist as articles). Angular's sanitizer would drop
   * `data-list`, which Quill 2 needs to tell bullet lists from ordered ones.
   */
  protected readonly items = computed<QuestionView[]>(() =>
    this.questions().map((item, index) => ({
      number: index + 1,
      html: this.sanitizer.bypassSecurityTrustHtml(item.question),
      answer: item.answer,
      comment: item.comment,
    })),
  );
  /** Numbers of the questions whose answer is shown. */
  protected readonly openAnswers = linkedSignal<
    readonly WhatWhereWhenQuestion[],
    ReadonlySet<number>
  >({
    source: this.questions,
    computation: () => new Set<number>(),
  });
  protected readonly allOpen = computed(
    () => this.items().length > 0 && this.openAnswers().size === this.items().length,
  );

  protected toggle(number: number): void {
    this.openAnswers.update((open) => {
      const next = new Set(open);
      if (!next.delete(number)) {
        next.add(number);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.openAnswers.set(
      this.allOpen() ? new Set() : new Set(this.items().map((item) => item.number)),
    );
  }
}
