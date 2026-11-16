import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../../../core/api/articles/articles.models';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';

/** Full-width featured article. A missing cover keeps the dark background; the title stays readable. */
@Component({
  selector: 'app-article-hero',
  imports: [NgOptimizedImage, RouterLink, TimeAgoPipe],
  templateUrl: './article-hero.html',
  styleUrl: './article-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHero {
  readonly article = input.required<ArticleSummary>();
}
