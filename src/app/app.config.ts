import { isPlatformBrowser } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  RouteReuseStrategy,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthService } from './core/auth/auth-service';
import { apiGetCacheInterceptor } from './core/interceptors/api-get-cache-interceptor';
import { CachedRouteReuse } from './core/services/cached-route-reuse';
import { ReadingListStore } from './core/services/reading-list-store';
import { SeoTitleStrategy } from './core/services/seo-title-strategy';
import { preloadReadingRoutes } from './preload-reading-routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // The address changes as soon as the route is known, not after the page script downloads.
      withRouterConfig({ urlUpdateStrategy: 'eager' }),
    ),
    // After provideRouter so this replaces the default strategy.
    { provide: RouteReuseStrategy, useClass: CachedRouteReuse },
    { provide: TitleStrategy, useExisting: SeoTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor, apiGetCacheInterceptor])),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      // A stored token means the next page is a reading page. Fetch its script during
      // `/auth/me`, so the first category click does not wait on a download.
      if (isPlatformBrowser(inject(PLATFORM_ID)) && auth.getToken()) {
        preloadReadingRoutes();
      }
      return auth.loadCurrentUser();
    }),
    // Instantiate eagerly so it syncs with the auth state from app start, not from first use.
    provideEnvironmentInitializer(() => inject(ReadingListStore)),
  ],
};
