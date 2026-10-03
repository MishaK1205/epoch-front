import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Icon, IconName } from '../../../shared/ui/icon/icon';
import { AuthService } from '../../auth/auth-service';
import { ReadingListStore } from '../../services/reading-list-store';
import { AUTH_CONFIG } from '../../tokens/auth-config';

export type ReadingListKind = 'saved' | 'read';
export type ReadingListToggleAppearance = 'icon' | 'button';

interface ToggleCopy {
  icon: IconName;
  label: string;
  activeLabel: string;
  action: string;
  activeAction: string;
}

const COPY: Record<ReadingListKind, ToggleCopy> = {
  saved: {
    icon: 'bookmark',
    label: 'შენახვა',
    activeLabel: 'შენახულია',
    action: 'სტატიის შენახვა',
    activeAction: 'შენახულიდან ამოშლა',
  },
  read: {
    icon: 'check',
    label: 'წაკითხულად მონიშვნა',
    activeLabel: 'წაკითხულია',
    action: 'წაკითხულად მონიშვნა',
    activeAction: 'წაუკითხავად მონიშვნა',
  },
};

/**
 * Save / mark-as-read toggle bound to `ReadingListStore`.
 * - `icon`: round icon button for card corners.
 * - `button` (default): pill with a label; shows the error message under itself.
 * Guests are sent to the login page with a `returnUrl` back to the current page.
 */
@Component({
  selector: 'app-reading-list-toggle',
  imports: [Icon],
  templateUrl: './reading-list-toggle.html',
  styleUrl: './reading-list-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.toggle-host--icon]': 'appearance() === "icon"',
  },
})
export class ReadingListToggle {
  private readonly store = inject(ReadingListStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly config = inject(AUTH_CONFIG);

  readonly articleId = input.required<string>();
  readonly kind = input<ReadingListKind>('saved');
  readonly appearance = input<ReadingListToggleAppearance>('button');
  readonly size = input<'sm' | 'md'>('md');
  /** Emits the new state after the server confirmed it. */
  readonly changed = output<boolean>();

  protected readonly active = computed(() => {
    const id = this.articleId();
    return this.kind() === 'saved' ? this.store.savedIds().has(id) : this.store.readIds().has(id);
  });
  protected readonly copy = computed(() => COPY[this.kind()]);
  protected readonly label = computed(() =>
    this.active() ? this.copy().activeLabel : this.copy().label,
  );
  protected readonly actionLabel = computed(() =>
    this.active() ? this.copy().activeAction : this.copy().action,
  );
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async toggle(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate([this.config.loginUrl], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    const id = this.articleId();
    this.error.set(null);
    this.pending.set(true);
    const messages =
      this.kind() === 'saved' ? await this.store.toggleSaved(id) : await this.store.toggleRead(id);
    this.pending.set(false);
    if (messages.length > 0) {
      this.error.set(messages[0]);
    } else {
      this.changed.emit(this.active());
    }
  }
}
