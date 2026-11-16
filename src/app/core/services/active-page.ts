import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Changes on every completed navigation. A page kept alive by `CachedRouteReuse` reads this
 * inside an effect so it can re-apply document head tags after `SeoTitleStrategy` resets them,
 * and so it does nothing while it is detached.
 */
export function navigationTick(): Signal<number> {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.id),
    ),
    { initialValue: 0 },
  );
}

/** True while this component's route is the one on screen, not a detached cached page. */
export function currentPageActive(): () => boolean {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  return () => isRouteInState(router.routerState.root, route);
}

function isRouteInState(node: ActivatedRoute, target: ActivatedRoute): boolean {
  if (node === target) {
    return true;
  }
  return node.children.some((child) => isRouteInState(child, target));
}
