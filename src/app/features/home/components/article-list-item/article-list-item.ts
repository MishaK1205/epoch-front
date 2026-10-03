import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../../../core/api/articles/articles.models';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';

export type ArticleListItemVariant = 'card' | 'lead';

/**
 * Article teaser card: image on top, light panel with a category chip and a serif title.
 * - `card` (default): small card; its size comes from the grid it sits in.
 * - `lead`: large card with a wider image, bigger title, excerpt and meta.
 */
@Component({
  selector: 'app-article-list-item',
  imports: [NgOptimizedImage, RouterLink, TimeAgoPipe],
  templateUrl: './article-list-item.html',
  styleUrl: './article-list-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListItem {
  readonly article = input.required<ArticleSummary>();
  readonly variant = input<ArticleListItemVariant>('card');

  protected readonly isLead = computed(() => this.variant() === 'lead');
}
