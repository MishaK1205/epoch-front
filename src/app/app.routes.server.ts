import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The whole app is rendered in the browser. The server has no token, so a
 * server render of any guarded route redirects to `/login` and that HTML is
 * what a refresh paints until the client finishes `/auth/me`. The client shell
 * (`index.html`) shows the boot wordmark instead, then the real page or login.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Client }];
