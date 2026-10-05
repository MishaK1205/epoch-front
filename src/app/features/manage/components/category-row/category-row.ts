import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CategoryBase } from '../../../../core/api/categories/categories.models';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';

/**
 * One row of the admin category tree. Top-level rows get "add subcategory"; Delete is disabled
 * while the category has subcategories or published articles (the server still decides).
 */
@Component({
  selector: 'app-category-row',
  imports: [Badge, Button, Icon],
  templateUrl: './category-row.html',
  styleUrl: './category-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryRow {
  readonly category = input.required<CategoryBase>();
  readonly subcategoryCount = input(0);
  /** This row's request is running. */
  readonly pending = input(false, { transform: booleanAttribute });
  /** Another request is running: actions are disabled. */
  readonly locked = input(false, { transform: booleanAttribute });
  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly addSubcategory = output<void>();

  protected readonly isTopLevel = computed(() => this.category().parent === null);
  protected readonly countLabel = computed(() => {
    const count = this.category().articleCount;
    return this.subcategoryCount() > 0 ? `სულ ${count} სტატია` : `${count} სტატია`;
  });
  protected readonly deleteBlockedReason = computed(() => {
    if (this.subcategoryCount() > 0) {
      return 'ჯერ წაშალეთ ქვეკატეგორიები';
    }
    return this.category().articleCount > 0 ? 'გამოიყენება სტატიებში' : '';
  });
  protected readonly hintId = computed(() => `delete-hint-${this.category().id}`);
}
