import { NgOptimizedImage } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../../../core/api/articles/articles.models';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { STATUS_BADGES, STATUS_LABELS } from '../../manage-labels';

/** One article in the management list, with its actions. */
@Component({
  selector: 'app-article-row',
  imports: [NgOptimizedImage, RouterLink, TimeAgoPipe, Badge, Button, Icon],
  templateUrl: './article-row.html',
  styleUrl: './article-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleRow {
  readonly article = input.required<ArticleSummary>();
  /** Disables the actions while one of them is running. */
  readonly pending = input(false, { transform: booleanAttribute });
  readonly publish = output<void>();
  readonly unpublish = output<void>();
  readonly remove = output<void>();

  protected readonly published = computed(() => this.article().status === 'published');
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.article().status]);
  protected readonly statusBadge = computed(() => STATUS_BADGES[this.article().status]);
}
