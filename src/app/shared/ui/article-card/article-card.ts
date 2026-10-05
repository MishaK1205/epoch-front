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
import { Icon } from '../icon/icon';

export type ArticleCardVariant = 'card' | 'lead';

/**
 * Article teaser card: image on top, light panel with a category chip ("Category › Subcategory";
 * plain text, since the whole card is one link) and a serif title.
 * - `card` (default): small card; its size comes from the grid it sits in.
 * - `lead`: large card with a wider image, bigger title, excerpt and meta.
 * - `read`: shows a small "read" chip next to the category.
 * Project an action (e.g. a save toggle) into the image corner with `<… cardAction />`;
 * it sits outside the link so clicking it doesn't navigate.
 */
@Component({
  selector: 'app-article-card',
  imports: [NgOptimizedImage, RouterLink, TimeAgoPipe, Icon],
  templateUrl: './article-card.html',
  styleUrl: './article-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCard {
  readonly article = input.required<ArticleSummary>();
  readonly variant = input<ArticleCardVariant>('card');
  readonly read = input(false, { transform: booleanAttribute });

  protected readonly isLead = computed(() => this.variant() === 'lead');
}
