import { FetchBackend, HttpBackend } from '@angular/common/http';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // The browser keeps XHR (upload progress); the server's XHR polyfill is deprecated.
    FetchBackend,
    { provide: HttpBackend, useExisting: FetchBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
