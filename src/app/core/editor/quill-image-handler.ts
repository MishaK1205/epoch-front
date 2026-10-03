import { getApiErrorMessages } from '../api/api-error-messages';
import { IMAGE_FILE_ACCEPT, validateImageFile } from '../api/images/image-file';
import { ImagesApi } from '../api/images/images-api';

/*
 * Minimal structural Quill types, so this helper works without depending on the `quill` package.
 * A real Quill instance satisfies `QuillLike`.
 */
export type QuillSource = 'api' | 'user' | 'silent';

export interface QuillRange {
  index: number;
  length: number;
}

export interface QuillDeltaOp {
  insert?: string | Record<string, unknown>;
  retain?: number | Record<string, unknown>;
  delete?: number;
}

export interface QuillDelta {
  ops: QuillDeltaOp[];
}

export interface QuillLike {
  getSelection(focus?: boolean): QuillRange | null;
  getLength(): number;
  insertEmbed(index: number, type: string, value: unknown, source?: QuillSource): unknown;
  setSelection(index: number, length?: number, source?: QuillSource): unknown;
  deleteText(index: number, length: number, source?: QuillSource): unknown;
  on(
    event: 'text-change',
    handler: (delta: QuillDelta, oldContents: QuillDelta, source: QuillSource) => void,
  ): unknown;
}

/** `this` inside Quill toolbar handlers and the Quill 2 uploader handler. */
export interface QuillModuleContext {
  quill: QuillLike;
}

export interface QuillImageUploadOptions {
  /** Called with user-facing messages when validation or upload fails. */
  onError?: (messages: string[]) => void;
}

/**
 * Toolbar image handler: `modules: { toolbar: { handlers: { image: createQuillImageHandler(imagesApi) } } }`.
 * Opens a file picker, validates the file, uploads it via `POST /images` and inserts the returned URL.
 */
export function createQuillImageHandler(
  imagesApi: ImagesApi,
  options: QuillImageUploadOptions = {},
): (this: QuillModuleContext) => void {
  return function (this: QuillModuleContext): void {
    const quill = this.quill;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = IMAGE_FILE_ACCEPT;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        uploadAndInsert(quill, imagesApi, file, getInsertIndex(quill), options);
      }
    });
    input.click();
  };
}

/**
 * Quill 2 uploader handler for dropped/pasted image files:
 * `modules: { uploader: { handler: createQuillUploaderHandler(imagesApi) } }`.
 * Replaces Quill's default behavior of inlining files as base64.
 */
export function createQuillUploaderHandler(
  imagesApi: ImagesApi,
  options: QuillImageUploadOptions = {},
): (this: QuillModuleContext, range: QuillRange, files: File[]) => void {
  return function (this: QuillModuleContext, range: QuillRange, files: File[]): void {
    let index = range.index;
    for (const file of files) {
      uploadAndInsert(this.quill, imagesApi, file, index, options);
      index += 1;
    }
  };
}

/**
 * Removes `data:` and `blob:` images that the user pastes or drops into the editor; the server
 * rejects them. Call once after creating the editor: `preventInlineImages(quill)`.
 */
export function preventInlineImages(quill: QuillLike): void {
  quill.on('text-change', (delta, _oldContents, source) => {
    if (source !== 'user') {
      return;
    }
    const invalidIndexes: number[] = [];
    let index = 0;
    for (const op of delta.ops) {
      if (op.retain !== undefined) {
        index += typeof op.retain === 'number' ? op.retain : 1;
      } else if (typeof op.insert === 'string') {
        index += op.insert.length;
      } else if (op.insert !== undefined) {
        if (isInlineImage(op.insert)) {
          invalidIndexes.push(index);
        }
        index += 1;
      }
    }
    for (const invalidIndex of invalidIndexes.reverse()) {
      quill.deleteText(invalidIndex, 1, 'api');
    }
  });
}

function uploadAndInsert(
  quill: QuillLike,
  imagesApi: ImagesApi,
  file: File,
  index: number,
  options: QuillImageUploadOptions,
): void {
  const validationError = validateImageFile(file);
  if (validationError) {
    options.onError?.([validationError]);
    return;
  }
  imagesApi.upload(file).subscribe({
    next: (image) => {
      quill.insertEmbed(index, 'image', image.url, 'user');
      quill.setSelection(index + 1, 0, 'silent');
    },
    error: (err: unknown) => options.onError?.(getApiErrorMessages(err)),
  });
}

function getInsertIndex(quill: QuillLike): number {
  return quill.getSelection(true)?.index ?? Math.max(quill.getLength() - 1, 0);
}

function isInlineImage(embed: Record<string, unknown>): boolean {
  const src = embed['image'];
  return typeof src === 'string' && /^(data|blob):/i.test(src.trim());
}
