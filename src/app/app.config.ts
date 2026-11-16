import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
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
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthService } from './core/auth/auth-service';
import { apiGetCacheInterceptor } from './core/interceptors/api-get-cache-interceptor';
import { CachedRouteReuse } from './core/services/cached-route-reuse';
import { ReadingListStore } from './core/services/reading-list-store';
import { SeoTitleStrategy } from './core/services/seo-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // After provideRouter so this replaces the default strategy.
    { provide: RouteReuseStrategy, useClass: CachedRouteReuse },
    { provide: TitleStrategy, useExisting: SeoTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor, apiGetCacheInterceptor])),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => inject(AuthService).loadCurrentUser()),
    // Instantiate eagerly so it syncs with the auth state from app start, not from first use.
    provideEnvironmentInitializer(() => inject(ReadingListStore)),
  ],
};
