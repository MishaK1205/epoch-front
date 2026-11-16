import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ReadingShell } from '../reading-shell/reading-shell';

/** Login is a paper page on its own. Every other route uses the editorial shell. */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, ReadingShell],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly login = computed(() => pathOf(this.url()).startsWith('/login'));
}
