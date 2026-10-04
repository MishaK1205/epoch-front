import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../../../core/api/articles/articles.models';
import { AuthService } from '../../../../core/auth/auth-service';
import { ReadingListToggle } from '../../../../core/reading-list/reading-list-toggle/reading-list-toggle';
import { ReadingListStore } from '../../../../core/services/reading-list-store';
import { ArticleCard } from '../../../../shared/ui/article-card/article-card';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Compact teasers shown next to the lead card. */
const SIDE_ITEMS = 4;

/**
 * Home-page section: an underlined title (with an optional "all articles" link), one large
 * lead card and a 2×2 block of small cards. Shows at most 5 articles.
 */
@Component({
  selector: 'app-article-section',
  imports: [RouterLink, ArticleCard, ReadingListToggle, Button, Icon],
  templateUrl: './article-section.html',
  styleUrl: './article-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleSection {
  protected readonly loggedIn = inject(AuthService).isLoggedIn;
  protected readonly readArticleIds = inject(ReadingListStore).readIds;

  readonly title = input.required<string>();
  readonly articles = input.required<ArticleSummary[]>();
  /** Router commands for the "ყველა სტატია" button; omitted → no button. */
  readonly link = input<string[]>();

  protected readonly lead = computed(() => this.articles()[0] ?? null);
  protected readonly sideItems = computed(() => this.articles().slice(1, 1 + SIDE_ITEMS));
}
