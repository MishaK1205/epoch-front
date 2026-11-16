import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn, provideRouter, RouteReuseStrategy, RouterOutlet } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ApiGetCache } from './api-get-cache';
import { CachedRouteReuse, routeShowsApiData } from './cached-route-reuse';

@Component({ template: 'home' })
class HomePage {}

@Component({ template: 'item' })
class ItemPage {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class ShellPage {}

@Component({ template: 'edit' })
class EditPage {}

const allowLeave: CanDeactivateFn<EditPage> = () => true;

function pageOf(harness: RouterTestingHarness): object {
  const element = harness.routeDebugElement;
  if (!element) {
    throw new Error('No routed component');
  }
  return element.componentInstance as object;
}

describe('routeShowsApiData', () => {
  it('treats home as only the root path', () => {
    expect(routeShowsApiData('/', '/articles')).toBe(true);
    expect(routeShowsApiData('/articles/slug', '/articles')).toBe(true);
    expect(routeShowsApiData('/manage/articles', '/articles')).toBe(true);
    expect(routeShowsApiData('/', '/me/saved-articles')).toBe(false);
    expect(routeShowsApiData('/me/saved', '/me/saved-articles')).toBe(true);
    expect(routeShowsApiData('/me/read', '/me/saved-articles')).toBe(false);
  });
});

describe('CachedRouteReuse', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: HomePage },
          { path: 'item', component: ItemPage },
          { path: 'edit', component: EditPage, canDeactivate: [allowLeave] },
        ]),
        { provide: RouteReuseStrategy, useClass: CachedRouteReuse },
      ],
    });
  });

  it('shows the same page again when nothing changed', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const home = pageOf(harness);

    await harness.navigateByUrl('/item');
    await harness.navigateByUrl('/');

    expect(pageOf(harness)).toBe(home);
  });

  it('loads the page again after a write that changes what it shows', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const home = pageOf(harness);

    await harness.navigateByUrl('/item');
    TestBed.inject(ApiGetCache).invalidatePrefix('/articles');
    await harness.navigateByUrl('/');

    expect(pageOf(harness)).not.toBe(home);
  });

  it('keeps the page when a different list changes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const home = pageOf(harness);

    await harness.navigateByUrl('/item');
    TestBed.inject(ApiGetCache).invalidatePrefix('/me/saved-articles');
    await harness.navigateByUrl('/');

    expect(pageOf(harness)).toBe(home);
  });

  it('does not restore an editor', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/edit');
    const editor = pageOf(harness);

    await harness.navigateByUrl('/');
    await harness.navigateByUrl('/edit');

    expect(pageOf(harness)).not.toBe(editor);
  });
});

describe('CachedRouteReuse inside a shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: ShellPage,
            children: [
              { path: '', pathMatch: 'full', component: HomePage },
              { path: 'item', component: ItemPage },
            ],
          },
        ]),
        { provide: RouteReuseStrategy, useClass: CachedRouteReuse },
      ],
    });
  });

  it('restores the child page and keeps the shell', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const shell = pageOf(harness);
    const home = harness.routeDebugElement?.children[0]?.componentInstance;

    await harness.navigateByUrl('/item');
    await harness.navigateByUrl('/');

    expect(pageOf(harness)).toBe(shell);
    expect(harness.routeDebugElement?.children[0]?.componentInstance).toBe(home);
  });
});
