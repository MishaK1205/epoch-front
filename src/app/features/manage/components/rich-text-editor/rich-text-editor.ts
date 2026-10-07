import {
  afterNextRender,
  AfterContentInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import type Quill from 'quill';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { ImagesApi } from '../../../../core/api/images/images-api';
import {
  createQuillImageHandler,
  createQuillUploaderHandler,
  preventInlineImages,
  QuillDelta,
} from '../../../../core/editor/quill-image-handler';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ControlState } from '../../../../shared/ui/form-control/control-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import {
  getValidationMessage,
  ValidationMessageOverrides,
} from '../../../../shared/validators/validation-messages';

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
];

const TOOLBAR_LABELS: Record<string, string> = {
  '.ql-header .ql-picker-label': 'სათაურის დონე',
  '.ql-bold': 'მუქი',
  '.ql-italic': 'დახრილი',
  '.ql-underline': 'ხაზგასმული',
  '.ql-strike': 'გადახაზული',
  '.ql-blockquote': 'ციტატა',
  '.ql-list[value="ordered"]': 'დანომრილი სია',
  '.ql-list[value="bullet"]': 'მარკირებული სია',
  '.ql-link': 'ბმული',
  '.ql-image': 'სურათის ატვირთვა',
  '.ql-clean': 'ფორმატირების მოხსნა',
};

const INLINE_IMAGE_MESSAGE =
  'ჩასმული სურათი წაიშალა: სურათი ატვირთეთ ხელსაწყოთა ზოლის ღილაკით ან ფაილის ჩაგდებით.';

let nextId = 0;

/**
 * Quill 2 editor as a form control (value = HTML, `''` when empty). Quill is loaded lazily
 * (`import('quill')`) so it stays out of the initial bundle.
 */
@Component({
  selector: 'app-rich-text-editor',
  imports: [Alert, Icon, Spinner],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditor implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly imagesApi = inject(ImagesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();
  private readonly editorEl = viewChild.required<ElementRef<HTMLElement>>('editor');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly hint = input('');
  readonly errorMessages = input<ValidationMessageOverrides>({});
  /** Focuses the editor and scrolls it into view as soon as Quill has loaded. */
  readonly focusOnInit = input(false, { transform: booleanAttribute });

  protected readonly id = `app-rich-text-editor-${nextId++}`;
  protected readonly labelId = `${this.id}-label`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  protected readonly ready = signal(false);
  protected readonly disabled = signal(false);
  protected readonly uploadErrors = signal<string[]>([]);
  protected readonly required = this.controlState.required;

  protected readonly errorMessage = computed(() =>
    this.controlState.touched()
      ? getValidationMessage(this.controlState.errors(), this.errorMessages())
      : null,
  );
  private readonly describedBy = computed(() => {
    if (this.errorMessage()) {
      return this.errorId;
    }
    return this.hint() ? this.hintId : null;
  });

  private quill: Quill | null = null;
  private pendingValue = '';
  private lastValue: string | null = null;
  private destroyed = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    afterNextRender(() => void this.createEditor());

    // Quill owns its root element; mirror the field state onto it for assistive tech.
    effect(() => {
      if (!this.ready() || !this.quill) {
        return;
      }
      const root = this.quill.root;
      setAttribute(root, 'aria-describedby', this.describedBy());
      setAttribute(root, 'aria-invalid', this.errorMessage() ? 'true' : null);
      setAttribute(root, 'aria-required', this.required() ? 'true' : null);
    });
  }

  ngAfterContentInit(): void {
    this.controlState.connect(this.ngControl?.control, this.destroyRef);
  }

  writeValue(value: unknown): void {
    const html = typeof value === 'string' ? value : '';
    if (!this.quill) {
      this.pendingValue = html;
      return;
    }
    if (html !== this.lastValue) {
      this.setContent(this.quill, html);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    this.quill?.enable(!isDisabled);
  }

  protected focus(): void {
    this.quill?.focus();
  }

  protected dismissErrors(): void {
    this.uploadErrors.set([]);
  }

  private async createEditor(): Promise<void> {
    const { default: QuillEditor } = await import('quill');
    if (this.destroyed) {
      return;
    }
    const onError = (messages: string[]): void => this.uploadErrors.set(messages);
    const quill = new QuillEditor(this.editorEl().nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: {
          container: TOOLBAR,
          handlers: { image: createQuillImageHandler(this.imagesApi, { onError }) },
        },
        uploader: {
          mimetypes: [...API_LIMITS.image.types],
          handler: createQuillUploaderHandler(this.imagesApi, { onError }),
        },
      },
    });
    preventInlineImages(quill);

    const root = quill.root;
    root.setAttribute('role', 'textbox');
    root.setAttribute('aria-multiline', 'true');
    root.setAttribute('aria-labelledby', this.labelId);
    this.labelToolbar(quill);

    quill.on('text-change', (delta: QuillDelta, _old: QuillDelta, source: string) => {
      if (source !== 'user') {
        return;
      }
      this.uploadErrors.set(hasInlineImage(delta) ? [INLINE_IMAGE_MESSAGE] : []);
      const html = this.readHtml(quill);
      this.lastValue = html;
      this.onChange(html);
    });
    quill.on('selection-change', (range: unknown) => {
      if (range === null) {
        this.onTouched();
      }
    });

    this.quill = quill;
    this.setContent(quill, this.pendingValue);
    quill.enable(!this.disabled());
    this.ready.set(true);
    if (this.focusOnInit()) {
      quill.focus();
      this.host.nativeElement.scrollIntoView({ block: 'center' });
    }
  }

  /** Doesn't use `dangerouslyPasteHTML`, which moves focus into the editor. */
  private setContent(quill: Quill, html: string): void {
    this.lastValue = html;
    if (html) {
      quill.setContents(quill.clipboard.convert({ html }), 'api');
    } else {
      quill.setText('', 'api');
    }
    quill.history.clear();
  }

  private readHtml(quill: Quill): string {
    const empty = quill.getText().trim() === '' && !quill.root.querySelector('img');
    return empty ? '' : quill.root.innerHTML;
  }

  private labelToolbar(quill: Quill): void {
    const toolbar = quill.getModule('toolbar') as { container: HTMLElement | null };
    for (const [selector, label] of Object.entries(TOOLBAR_LABELS)) {
      toolbar.container?.querySelector(selector)?.setAttribute('aria-label', label);
    }
  }
}

function setAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

function hasInlineImage(delta: QuillDelta): boolean {
  return delta.ops.some((op) => {
    const image = typeof op.insert === 'object' ? op.insert['image'] : undefined;
    return typeof image === 'string' && /^(data|blob):/i.test(image.trim());
  });
}
