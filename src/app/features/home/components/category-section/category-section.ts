import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { Category } from '../../../../core/api/categories/categories.models';
import { ArticleSection } from '../article-section/article-section';

/** Lead card + 4 small cards. */
const SECTION_SIZE = 5;

/**
 * Home-page section for one category: loads its newest articles and links to
 * `/category/:slug`. Renders nothing while loading, on error, or when the category is empty.
 */
@Component({
  selector: 'app-category-section',
  imports: [ArticleSection],
  template: `
    @if (items().length > 0) {
      <app-article-section
        [title]="category().name"
        [articles]="items()"
        [link]="['/category', category().slug]"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Hidden (not just empty) so the parent's flex gap doesn't leave a blank step
  host: { '[hidden]': 'items().length === 0' },
})
export class CategorySection {
  private readonly articlesApi = inject(ArticlesApi);

  readonly category = input.required<Category>();

  private readonly articles = rxResource({
    params: () => this.category().slug,
    stream: ({ params }) =>
      this.articlesApi.listPublished({ category: params, limit: SECTION_SIZE }),
  });

  protected readonly items = computed(() =>
    this.articles.hasValue() ? this.articles.value().items : [],
  );
}
