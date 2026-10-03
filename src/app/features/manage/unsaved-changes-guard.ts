import { CanDeactivateFn } from '@angular/router';

/** Implemented by pages with forms: resolve `true` to leave, `false` to stay. */
export interface HasUnsavedChanges {
  canDeactivate(): boolean | Promise<boolean>;
}

/** Asks the page whether it can be left (the page shows its own confirm dialog). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component.canDeactivate();
