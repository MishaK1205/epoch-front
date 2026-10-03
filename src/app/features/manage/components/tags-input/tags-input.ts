import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { ControlState } from '../../../../shared/ui/form-control/control-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  getValidationMessage,
  ValidationMessageOverrides,
} from '../../../../shared/validators/validation-messages';

const LIMITS = API_LIMITS.tags;

const DEFAULT_MESSAGES: ValidationMessageOverrides = {
  maxTags: `მაქსიმუმ ${LIMITS.maxCount} თეგი.`,
  tagLength: `თეგი უნდა იყოს ${LIMITS.minLength}–${LIMITS.maxLength} სიმბოლო.`,
};

/** Splits raw input on commas; trims, lowercases and drops empty parts. */
export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

/** Adds the parsed tags to `current` without duplicates, keeping at most `maxCount`. */
export function mergeTags(
  current: readonly string[],
  raw: string,
  maxCount: number = LIMITS.maxCount,
): string[] {
  const merged = [...current];
  for (const tag of parseTags(raw)) {
    if (merged.length >= maxCount) {
      break;
    }
    if (!merged.includes(tag)) {
      merged.push(tag);
    }
  }
  return merged;
}

let nextId = 0;

/** Chips input for a `string[]` control: Enter or comma adds, Backspace on empty removes. */
@Component({
  selector: 'app-tags-input',
  imports: [Icon],
  templateUrl: './tags-input.html',
  styleUrl: './tags-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsInput implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly label = input.required<string>();
  readonly placeholder = input('დაწერეთ და დააჭირეთ Enter-ს');
  readonly hint = input('');
  readonly errorMessages = input<ValidationMessageOverrides>({});

  protected readonly id = `app-tags-input-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly countId = `${this.id}-count`;
  protected readonly limits = LIMITS;

  protected readonly tags = signal<string[]>([]);
  protected readonly disabled = signal(false);
  protected readonly full = computed(() => this.tags().length >= LIMITS.maxCount);

  protected readonly errorMessage = computed(() =>
    this.controlState.touched()
      ? getValidationMessage(this.controlState.errors(), {
          ...DEFAULT_MESSAGES,
          ...this.errorMessages(),
        })
      : null,
  );
  protected readonly describedBy = computed(() => {
    const message = this.errorMessage() ? this.errorId : this.hint() ? this.hintId : null;
    return [message, this.countId].filter(Boolean).join(' ');
  });

  private onChange: (value: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngAfterContentInit(): void {
    this.controlState.connect(this.ngControl?.control, this.destroyRef);
  }

  writeValue(value: unknown): void {
    this.tags.set(
      Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [],
    );
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(input: HTMLInputElement): void {
    if (input.value.includes(',')) {
      this.commit(input.value);
      input.value = '';
    }
  }

  protected onKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.isComposing) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit(input.value);
      input.value = '';
    } else if (event.key === 'Backspace' && input.value === '' && this.tags().length > 0) {
      this.remove(this.tags()[this.tags().length - 1]);
    }
  }

  protected onBlur(input: HTMLInputElement): void {
    if (input.value.trim()) {
      this.commit(input.value);
      input.value = '';
    }
    this.onTouched();
  }

  protected remove(tag: string): void {
    this.update(this.tags().filter((item) => item !== tag));
  }

  private commit(raw: string): void {
    const next = mergeTags(this.tags(), raw);
    if (next.length !== this.tags().length) {
      this.update(next);
    }
  }

  private update(tags: string[]): void {
    this.tags.set(tags);
    this.onChange(tags);
  }
}
