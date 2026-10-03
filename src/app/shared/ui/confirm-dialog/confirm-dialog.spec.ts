import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      #dialog
      title="წავშალოთ?"
      confirmLabel="წაშლა"
      (confirmed)="events.push('confirmed')"
      (cancelled)="events.push('cancelled')"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly dialog = viewChild.required(ConfirmDialog);
  readonly events: string[] = [];
}

/** Like browsers, the native `close` event is dispatched asynchronously. */
function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (this.open) {
      this.open = false;
      setTimeout(() => this.dispatchEvent(new Event('close')));
    }
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('ConfirmDialog', () => {
  const original = {
    showModal: HTMLDialogElement.prototype.showModal,
    close: HTMLDialogElement.prototype.close,
  };

  beforeEach(stubDialog);
  afterEach(() => Object.assign(HTMLDialogElement.prototype, original));

  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    const open = async () => {
      host.dialog().open();
      await fixture.whenStable();
    };
    return { fixture, host, element, button, open };
  }

  it('emits confirmed once and renders content only while open', async () => {
    const { fixture, host, element, button, open } = await setup();
    expect(element.querySelector('h2')).toBeNull();

    await open();
    expect(element.querySelector('h2')?.textContent).toBe('წავშალოთ?');

    button('წაშლა')?.click();
    await flush();
    await fixture.whenStable();

    expect(host.events).toEqual(['confirmed']);
    expect(element.querySelector('h2')).toBeNull();
  });

  it('stays open with content when reopened before the previous close event arrives', async () => {
    const { fixture, host, element, button, open } = await setup();

    await open();
    button('გაუქმება')?.click();
    await open();
    await flush();
    await fixture.whenStable();

    expect(host.events).toEqual(['cancelled']);
    expect(element.querySelector('dialog')?.open).toBe(true);
    expect(button('წაშლა')).toBeDefined();
  });

  it('treats Escape (native cancel) as cancelled', async () => {
    const { fixture, host, element, open } = await setup();

    await open();
    element.querySelector('dialog')?.dispatchEvent(new Event('cancel'));
    await flush();
    await fixture.whenStable();

    expect(host.events).toEqual(['cancelled']);
  });
});
