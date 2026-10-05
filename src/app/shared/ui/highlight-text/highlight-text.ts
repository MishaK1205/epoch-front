import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { highlight } from '../../utils/highlight';

/** Text with every query word wrapped in `<mark>`: `<app-highlight-text [text] [query] />`. */
@Component({
  selector: 'app-highlight-text',
  // Kept on one line: whitespace around the segments would show up as extra spaces.
  template: `@for (segment of segments(); track $index) {@if (segment.match) {<mark class="hit">{{ segment.text }}</mark>} @else {<ng-container>{{ segment.text }}</ng-container>}}`,
  styleUrl: './highlight-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightText {
  readonly text = input.required<string>();
  readonly query = input('');

  protected readonly segments = computed(() => highlight(this.text(), this.query()));
}
