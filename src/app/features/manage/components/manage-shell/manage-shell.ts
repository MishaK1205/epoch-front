import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth-service';

const TITLE_SUFFIX = ' — Epoch';

/** Layout of the `/manage` area: kicker, page title (from the active route) and tabs. */
@Component({
  selector: 'app-manage-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './manage-shell.html',
  styleUrl: './manage-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-allow-copy': '' },
})
export class ManageShell {
  private readonly router = inject(Router);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly heading = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.routeTitle()),
    ),
    { initialValue: this.routeTitle() },
  );

  private routeTitle(): string {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const title = route.title ?? 'მართვა';
    return title.endsWith(TITLE_SUFFIX) ? title.slice(0, -TITLE_SUFFIX.length) : title;
  }
}
