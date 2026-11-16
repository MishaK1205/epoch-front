import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * `/login` is the only public page. Every other route is behind `roleGuard('admin')`.
 * The server has no token, so those routes redirect to `/login` and do not call the API.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'category/:slug', renderMode: RenderMode.Server },
  { path: 'articles', renderMode: RenderMode.Server },
  { path: 'articles/:slug', renderMode: RenderMode.Server },
  { path: 'search', renderMode: RenderMode.Server },
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'manage', renderMode: RenderMode.Client },
  { path: 'manage/**', renderMode: RenderMode.Client },
  { path: 'me', renderMode: RenderMode.Client },
  { path: 'me/**', renderMode: RenderMode.Client },
  { path: 'what-where-when', renderMode: RenderMode.Client },
  { path: 'what-where-when/**', renderMode: RenderMode.Client },
  { path: 'flashcards', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
