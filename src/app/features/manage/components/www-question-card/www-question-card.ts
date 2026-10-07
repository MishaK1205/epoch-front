import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { SERVER_ERROR_KEY } from '../../../../shared/validators/validation-messages';
import { QuestionForm } from '../../pages/www-package-editor/www-package-form';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';

let nextId = 0;

/** One question of a "What? Where? When?" package in the editor. */
@Component({
  selector: 'app-www-question-card',
  imports: [ReactiveFormsModule, Button, Icon, RichTextEditor, TextareaField],
  templateUrl: './www-question-card.html',
  styleUrl: './www-question-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwwQuestionCard {
  readonly group = input.required<QuestionForm>();
  /** 0-based position; the heading shows `index + 1`. */
  readonly index = input.required<number>();
  readonly total = input.required<number>();
  readonly focusEditor = input(false, { transform: booleanAttribute });
  readonly canDuplicate = input(true, { transform: booleanAttribute });
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly duplicate = output<void>();
  readonly remove = output<void>();

  protected readonly limits = API_LIMITS.whatWhereWhen;
  protected readonly headingId = `app-www-question-${nextId++}`;
  protected readonly number = computed(() => this.index() + 1);
  protected readonly first = computed(() => this.index() === 0);
  protected readonly last = computed(() => this.index() === this.total() - 1);

  private readonly state = toSignal(
    toObservable(this.group).pipe(
      switchMap((group) =>
        group.events.pipe(
          startWith(null),
          map(() => {
            const serverError: unknown = group.errors?.[SERVER_ERROR_KEY];
            return {
              invalid: group.invalid && group.touched,
              serverError: typeof serverError === 'string' ? serverError : '',
            };
          }),
        ),
      ),
    ),
    { initialValue: { invalid: false, serverError: '' } },
  );
  protected readonly invalid = computed(() => this.state().invalid);
  protected readonly serverError = computed(() => this.state().serverError);
}
