import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Elements where copying stays allowed: form fields, the rich-text editor and opted-in areas. */
export const COPY_ALLOWED_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-allow-copy]';

const BLOCKED_EVENTS = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'] as const;

export function isCopyAllowed(target: EventTarget | null): boolean {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return !!element?.closest(COPY_ALLOWED_SELECTOR);
}

/**
 * Blocks copying, cutting, the context menu, dragging and text selection outside
 * `COPY_ALLOWED_SELECTOR`. Deterrent only: page source, dev tools and SSR HTML stay readable.
 */
@Injectable({ providedIn: 'root' })
export class CopyProtection {
  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    const document = inject(DOCUMENT);
    const block = (event: Event): void => {
      if (!isCopyAllowed(event.target)) {
        event.preventDefault();
      }
    };
    for (const type of BLOCKED_EVENTS) {
      document.addEventListener(type, block);
    }
    inject(DestroyRef).onDestroy(() => {
      for (const type of BLOCKED_EVENTS) {
        document.removeEventListener(type, block);
      }
    });
  }
}
