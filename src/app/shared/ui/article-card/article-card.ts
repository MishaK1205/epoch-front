import { NgOptimizedImage } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../../core/api/articles/articles.models';
import { TimeAgoPipe } from '../../pipes/time-ago-pipe';
import { HighlightText } from '../highlight-text/highlight-text';
import { Icon } from '../icon/icon';

export type ArticleCardVariant = 'card' | 'lead';

/**
 * Article teaser: cover on top, category eyebrow, serif title, excerpt, and the date.
 * A missing cover shows a placeholder. `[read]="true"` adds „წაკითხული“ next to the date.
 * Project a control with `<… cardAction />` (outside the link) and optional `<… cardFooter />`.
 * - `highlightQuery`: marks the search words in the title.
 */
@Component({
  selector: 'app-article-card',
  imports: [NgOptimizedImage, RouterLink, TimeAgoPipe, HighlightText, Icon],
  templateUrl: './article-card.html',
  styleUrl: './article-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCard {
  readonly article = input.required<ArticleSummary>();
  readonly variant = input<ArticleCardVariant>('card');
  readonly read = input(false, { transform: booleanAttribute });
  readonly highlightQuery = input('');

  protected readonly isLead = computed(() => this.variant() === 'lead');
}
