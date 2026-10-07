import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessages } from '../../../../core/api/api-error-messages';
import { validateImageFile } from '../../../../core/api/images/image-file';
import { ImagesApi } from '../../../../core/api/images/images-api';
import { DocxDocument, readDocx } from '../../../../shared/utils/docx';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { QuestionFormValue } from '../../pages/www-package-editor/www-package-form';
import {
  ImportedQuestion,
  questionHtml,
  questionImageIds,
  splitQuestions,
} from '../../pages/www-package-editor/www-question-import';

const ACCEPT =
  '.docx,.pages,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PAGES_MESSAGE =
  'Pages-ის ფაილს ბრაუზერი ვერ წაიკითხავს. Pages-ში აირჩიეთ File → Export To → Word… და ატვირთეთ მიღებული .docx ფაილი.';
const DOC_MESSAGE =
  'ძველი .doc ფორმატი არ არის მხარდაჭერილი. შეინახეთ ფაილი .docx ფორმატში (File → Save As → Word Document) და ატვირთეთ ხელახლა.';
const WRONG_TYPE_MESSAGE = 'ატვირთეთ Word-ის .docx ფაილი.';
const READ_ERROR_MESSAGE =
  'ფაილი ვერ წაიკითხა. დარწმუნდით, რომ ეს Word-ის .docx ფაილია და არ არის დაზიანებული.';
const NO_QUESTIONS_MESSAGE =
  'კითხვები ვერ მოიძებნა. კითხვა უნდა იწყებოდეს ნომრით (1., 2., …), პასუხი — „პასუხი:“-ით, კომენტარი — „კომენტარი:“-ით.';

export interface QuestionImportResult {
  fileName: string;
  count: number;
  warnings: string[];
}

/**
 * Reads questions, answers and comments from a Word document and uploads its images. The
 * questions go to the editor through `imported`; package fields are filled in by hand.
 */
@Component({
  selector: 'app-www-question-import',
  imports: [Alert, Button, Icon],
  templateUrl: './www-question-import.html',
  styleUrl: './www-question-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dragging]': 'dragging()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'dragging.set(false)',
    '(drop)': 'onDrop($event)',
  },
})
export class WwwQuestionImport {
  private readonly imagesApi = inject(ImagesApi);
  private destroyed = false;

  /** How many questions the package can still take. */
  readonly capacity = input.required<number>();
  readonly imported = output<QuestionFormValue[]>();

  protected readonly accept = ACCEPT;
  protected readonly busy = signal(false);
  protected readonly dragging = signal(false);
  protected readonly progress = signal('');
  protected readonly errors = signal<string[]>([]);
  protected readonly result = signal<QuestionImportResult | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  protected onFileSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void this.import(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    this.dragging.set(!this.busy());
  }

  protected onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files[0];
    if (!file) {
      return;
    }
    event.preventDefault();
    this.dragging.set(false);
    void this.import(file);
  }

  protected dismiss(): void {
    this.errors.set([]);
    this.result.set(null);
  }

  private async import(file: File): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.dismiss();
    const formatError = unsupportedFormat(file);
    if (formatError) {
      this.errors.set([formatError]);
      return;
    }
    if (this.capacity() <= 0) {
      this.errors.set(['პაკეტში კითხვების მაქსიმალური რაოდენობა უკვე დამატებულია.']);
      return;
    }
    this.busy.set(true);
    this.progress.set('ფაილი იკითხება…');
    try {
      let doc: DocxDocument;
      try {
        doc = await readDocx(await file.arrayBuffer());
      } catch {
        this.errors.set([READ_ERROR_MESSAGE]);
        return;
      }
      const found = splitQuestions(doc.paragraphs);
      if (found.length === 0) {
        this.errors.set([NO_QUESTIONS_MESSAGE]);
        return;
      }
      const warnings: string[] = [];
      const questions = found.slice(0, this.capacity());
      if (questions.length < found.length) {
        warnings.push(
          `დოკუმენტში ${found.length} კითხვაა, დაემატა პირველი ${questions.length} (პაკეტის ლიმიტი).`,
        );
      }
      const imageUrls = await this.uploadImages(doc, questions, warnings);
      if (this.destroyed) {
        return;
      }
      warnings.push(...contentWarnings(questions));
      this.imported.emit(
        questions.map((question) => ({
          question: questionHtml(question.body, imageUrls),
          answer: question.answer,
          comment: question.comment,
        })),
      );
      this.result.set({ fileName: file.name, count: questions.length, warnings });
    } finally {
      this.busy.set(false);
      this.progress.set('');
    }
  }

  /** Uploads every image once; failures become warnings and the image is left out. */
  private async uploadImages(
    doc: DocxDocument,
    questions: readonly ImportedQuestion[],
    warnings: string[],
  ): Promise<Map<string, string>> {
    const targets = questions.flatMap((question, index) =>
      questionImageIds(question.body).map((id) => ({ id, number: index + 1 })),
    );
    const ids = [...new Set(targets.map((target) => target.id))];
    const urls = new Map<string, string>();
    for (const [index, id] of ids.entries()) {
      if (this.destroyed) {
        break;
      }
      this.progress.set(`სურათები იტვირთება: ${index + 1} / ${ids.length}`);
      const numbers = targets.filter((target) => target.id === id).map((target) => target.number);
      const prefix = `დოკუმენტის კითხვა ${numbers.join(', ')}: სურათი ვერ დაემატა`;
      const file = await doc.readImage(id).catch(() => null);
      const invalid = file ? validateImageFile(file) : 'ფაილი ვერ მოიძებნა დოკუმენტში.';
      if (!file || invalid) {
        warnings.push(`${prefix} — ${invalid}`);
        continue;
      }
      try {
        urls.set(id, (await firstValueFrom(this.imagesApi.upload(file))).url);
      } catch (err) {
        warnings.push(`${prefix} — ${getApiErrorMessages(err).join(' ')}`);
      }
    }
    return urls;
  }
}

function unsupportedFormat(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'docx') {
    return null;
  }
  if (extension === 'pages') {
    return PAGES_MESSAGE;
  }
  return extension === 'doc' ? DOC_MESSAGE : WRONG_TYPE_MESSAGE;
}

/** Numbers are positions in the document (1-based), which may differ from the editor's. */
function contentWarnings(questions: readonly ImportedQuestion[]): string[] {
  const missingAnswers: number[] = [];
  const skippedImages: number[] = [];
  questions.forEach((question, index) => {
    if (!question.answer) {
      missingAnswers.push(index + 1);
    }
    if (question.skippedImages > 0) {
      skippedImages.push(index + 1);
    }
  });
  const warnings: string[] = [];
  if (missingAnswers.length > 0) {
    warnings.push(`პასუხი ვერ მოიძებნა — დოკუმენტის კითხვა ${missingAnswers.join(', ')}.`);
  }
  if (skippedImages.length > 0) {
    warnings.push(
      `დოკუმენტის კითხვა ${skippedImages.join(', ')}: პასუხში ან კომენტარში არის სურათი — ` +
        'ეს ველები მხოლოდ ტექსტს იღებს, ამიტომ სურათი არ დაემატა.',
    );
  }
  return warnings;
}
