import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Modal confirmation on a native `<dialog>`. Call `open()` via a template ref / `viewChild`:
 * `<app-confirm-dialog #dlg title="წაშლა?" message="…" danger (confirmed)="remove()" />`.
 * `Escape`, the backdrop and the cancel button close it and emit `cancelled`.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('დადასტურება');
  readonly cancelLabel = input('გაუქმება');
  readonly danger = input(false, { transform: booleanAttribute });
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly titleId = `app-confirm-dialog-${nextId++}-title`;
  protected readonly messageId = `${this.titleId}-message`;
  protected readonly isOpen = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
      this.isOpen.set(true);
    }
  }

  close(): void {
    this.finish(false);
  }

  protected confirm(): void {
    this.finish(true);
  }

  /**
   * The native `close` event is async and may arrive after the dialog was reopened, so the
   * result is settled synchronously in `finish()`; this only covers closes from elsewhere.
   */
  protected onClose(): void {
    if (this.isOpen() && !this.dialog().nativeElement.open) {
      this.finish(false);
    }
  }

  private finish(confirmed: boolean): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.dialog().nativeElement.close();
    if (confirmed) {
      this.confirmed.emit();
    } else {
      this.cancelled.emit();
    }
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
