import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../../../shared/ui/icon/icon';
import { AuthService } from '../../auth/auth-service';
import { SearchBox } from '../../search/search-box/search-box';
import { CategoriesStore } from '../../services/categories-store';
import { ReadingListStore } from '../../services/reading-list-store';

/**
 * Editorial chrome for every page except login: sidebar, top bar, and the routed page.
 * Login has its own paper page, without this sidebar.
 */
@Component({
  selector: 'app-reading-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, SearchBox],
  templateUrl: './reading-shell.html',
  styleUrl: './reading-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sidebar-open]': 'sidebarOpen()',
    '(document:keydown.escape)': 'closeSidebar()',
  },
})
export class ReadingShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly readingList = inject(ReadingListStore);
  private readonly path = signal(this.router.url);
  private readonly narrow = signal(false);

  protected readonly user = this.auth.currentUser;
  protected readonly categories = inject(CategoriesStore).categories;
  protected readonly savedCount = computed(() => this.readingList.savedIds().size);
  /** Hidden on every viewport until the top-bar button opens it. */
  protected readonly sidebarOpen = signal(false);
  protected readonly articlesActive = computed(() => {
    const path = this.path().split(/[?#]/)[0];
    return path === '/articles' || path.startsWith('/articles/') || path.startsWith('/category/');
  });

  protected topicActive(slug: string): boolean {
    const [path, query = ''] = this.path().split(/[?#]/);
    return path === '/articles' && new URLSearchParams(query).get('category') === slug;
  }
  protected readonly initial = computed(() => {
    const name = this.user()?.username ?? '';
    return Array.from(name)[0]?.toUpperCase() ?? 'ე';
  });

  constructor() {
    afterNextRender(() => {
      const media = window.matchMedia('(max-width: 767.98px)');
      const sync = () => this.narrow.set(media.matches);
      sync();
      media.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', sync));
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.path.set(this.router.url);
        if (this.narrow()) this.closeSidebar();
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected closeIfNarrow(): void {
    if (this.narrow()) this.closeSidebar();
  }

  protected logout(): void {
    this.auth.logout();
    this.closeSidebar();
    void this.router.navigateByUrl('/');
  }
}
