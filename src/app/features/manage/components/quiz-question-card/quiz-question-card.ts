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
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { SERVER_ERROR_KEY } from '../../../../shared/validators/validation-messages';
import {
  DUPLICATE_OPTIONS_KEY,
  NO_CORRECT_KEY,
  QuestionForm,
} from '../../pages/quiz-editor/quiz-form';
import { CoverImagePicker } from '../cover-image-picker/cover-image-picker';

let nextId = 0;

/** Labels of the four options. */
const OPTION_LETTERS = ['ა', 'ბ', 'გ', 'დ'] as const;

interface CardState {
  touched: boolean;
  invalid: boolean;
  serverError: string;
  noCorrect: boolean;
  duplicateOptions: boolean;
  correctIndex: number;
  imageUrl: string;
  imageAlt: string;
}

const INITIAL_STATE: CardState = {
  touched: false,
  invalid: false,
  serverError: '',
  noCorrect: false,
  duplicateOptions: false,
  correctIndex: -1,
  imageUrl: '',
  imageAlt: '',
};

/** One multiple-choice question of a quiz in the editor: text, optional image, 4 options. */
@Component({
  selector: 'app-quiz-question-card',
  imports: [ReactiveFormsModule, Button, CoverImagePicker, Icon, InputField, TextareaField],
  templateUrl: './quiz-question-card.html',
  styleUrl: './quiz-question-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQuestionCard {
  readonly group = input.required<QuestionForm>();
  /** 0-based position; the heading shows `index + 1`. */
  readonly index = input.required<number>();
  readonly total = input.required<number>();
  readonly canDuplicate = input(true, { transform: booleanAttribute });
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly duplicate = output<void>();
  readonly remove = output<void>();

  protected readonly limits = API_LIMITS.quiz;
  protected readonly letters = OPTION_LETTERS;
  protected readonly cardId = `app-quiz-question-${nextId++}`;
  protected readonly number = computed(() => this.index() + 1);
  protected readonly first = computed(() => this.index() === 0);
  protected readonly last = computed(() => this.index() === this.total() - 1);

  /** Form arrays and groups aren't signals: mirror what the template needs. */
  private readonly state = toSignal(
    toObservable(this.group).pipe(
      switchMap((group) =>
        group.events.pipe(
          startWith(null),
          map((): CardState => {
            const serverError: unknown = group.errors?.[SERVER_ERROR_KEY];
            const { correctIndex, imageUrl, imageAlt } = group.getRawValue();
            return {
              touched: group.touched,
              invalid: group.invalid && group.touched,
              serverError: typeof serverError === 'string' ? serverError : '',
              noCorrect: group.hasError(NO_CORRECT_KEY),
              duplicateOptions: group.hasError(DUPLICATE_OPTIONS_KEY),
              correctIndex,
              imageUrl,
              imageAlt,
            };
          }),
        ),
      ),
    ),
    { initialValue: INITIAL_STATE },
  );
  protected readonly invalid = computed(() => this.state().invalid);
  protected readonly serverError = computed(() => this.state().serverError);
  protected readonly correctIndex = computed(() => this.state().correctIndex);
  protected readonly imageUrl = computed(() => this.state().imageUrl || null);
  protected readonly imageAlt = computed(() => this.state().imageAlt);
  protected readonly choiceError = computed(() => {
    const state = this.state();
    if (!state.touched) {
      return '';
    }
    if (state.noCorrect) {
      return 'მონიშნეთ სწორი პასუხი.';
    }
    return state.duplicateOptions ? 'ოთხივე პასუხი განსხვავებული უნდა იყოს.' : '';
  });
  protected readonly optionControls = computed(() => this.group().controls.options.controls);
}
