import { NgTemplateOutlet } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { IMAGE_FILE_ACCEPT, validateImageFile } from '../../../../core/api/images/image-file';
import { ImagesApi } from '../../../../core/api/images/images-api';
import { UploadedImage } from '../../../../core/api/images/images.models';
import { Button } from '../../../../shared/ui/button/button';
import { ControlState } from '../../../../shared/ui/form-control/control-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import {
  getValidationMessage,
  ValidationMessageOverrides,
} from '../../../../shared/validators/validation-messages';
import { getManageErrorMessages } from '../../manage-errors';

let nextId = 0;

/**
 * Cover image control (value = image id). Uploads with progress, previews the image and edits
 * its alt text. "მოშორება" only clears the id; the uploaded image stays on the server.
 */
@Component({
  selector: 'app-cover-image-picker',
  imports: [NgTemplateOutlet, ReactiveFormsModule, Button, Icon, InputField],
  templateUrl: './cover-image-picker.html',
  styleUrl: './cover-image-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverImagePicker implements ControlValueAccessor, AfterContentInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly imagesApi = inject(ImagesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly controlState = new ControlState();

  readonly label = input.required<string>();
  /** URL of the current image (e.g. `article.coverImage.url` when editing). */
  readonly previewUrl = input<string | null>(null);
  readonly previewAlt = input('');
  readonly errorMessages = input<ValidationMessageOverrides>({});

  protected readonly id = `app-cover-image-picker-${nextId++}`;
  protected readonly labelId = `${this.id}-label`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly accept = IMAGE_FILE_ACCEPT;
  protected readonly maxSizeMb = API_LIMITS.image.maxSizeBytes / (1024 * 1024);

  protected readonly imageId = signal('');
  protected readonly preview = linkedSignal(() => this.previewUrl());
  protected readonly progress = signal<number | null>(null);
  protected readonly uploadErrors = signal<string[]>([]);
  protected readonly dragging = signal(false);
  protected readonly disabled = signal(false);
  protected readonly altStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly required = this.controlState.required;

  protected readonly altControl = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(API_LIMITS.imageAlt.max),
  });
  protected readonly altMaxLength = API_LIMITS.imageAlt.max;

  protected readonly uploading = computed(() => this.progress() !== null);
  protected readonly hasImage = computed(() => this.imageId() !== '' && this.preview() !== null);
  protected readonly errorMessage = computed(() =>
    this.controlState.touched() && !this.uploading()
      ? getValidationMessage(this.controlState.errors(), {
          required: 'ატვირთეთ მთავარი სურათი.',
          ...this.errorMessages(),
        })
      : null,
  );

  private savedAlt = '';
  private upload: Subscription | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    toObservable(this.previewAlt)
      .pipe(takeUntilDestroyed())
      .subscribe((alt) => {
        this.savedAlt = alt;
        this.altControl.reset(alt);
      });
  }

  ngAfterContentInit(): void {
    this.controlState.connect(this.ngControl?.control, this.destroyRef);
  }

  writeValue(value: unknown): void {
    this.imageId.set(typeof value === 'string' ? value : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onFileSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.uploadFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.disabled()) {
      this.uploadFile(file);
    }
  }

  protected removeImage(): void {
    this.upload?.unsubscribe();
    this.progress.set(null);
    this.imageId.set('');
    this.preview.set(null);
    this.onChange('');
    this.onTouched();
  }

  protected saveAlt(): void {
    const alt = this.altControl.value.trim();
    const id = this.imageId();
    if (!id || this.altControl.invalid || alt === this.savedAlt) {
      return;
    }
    this.altStatus.set('saving');
    this.imagesApi
      .updateAlt(id, alt)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (image) => {
          this.savedAlt = image.alt ?? '';
          this.altStatus.set('saved');
        },
        error: (err: unknown) => {
          this.altStatus.set('idle');
          this.uploadErrors.set(getManageErrorMessages(err));
        },
      });
  }

  private uploadFile(file: File): void {
    const error = validateImageFile(file);
    if (error) {
      this.uploadErrors.set([error]);
      return;
    }
    this.uploadErrors.set([]);
    this.progress.set(0);
    this.upload?.unsubscribe();
    this.upload = this.imagesApi
      .uploadWithProgress(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.progress.set(event.total ? Math.round((event.loaded / event.total) * 100) : 0);
          } else if (event.type === HttpEventType.Response && event.body) {
            this.useImage(event.body);
          }
        },
        error: (err: unknown) => {
          this.progress.set(null);
          this.uploadErrors.set(getManageErrorMessages(err));
        },
      });
  }

  private useImage(image: UploadedImage): void {
    this.progress.set(null);
    this.imageId.set(image.id);
    this.preview.set(image.url);
    this.savedAlt = image.alt ?? '';
    this.altControl.reset(this.savedAlt);
    this.altStatus.set('idle');
    this.onChange(image.id);
    this.onTouched();
  }
}
