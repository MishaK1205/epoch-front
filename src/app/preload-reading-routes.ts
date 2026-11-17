/**
 * Downloads the article pages while the session is still restoring.
 * The router does not change the page, and the page does not call the API, until
 * that script has arrived — so a category click otherwise sits still for the whole
 * download. Same `import()` URLs the routes use, so the click finds the script loaded.
 */
export function preloadReadingRoutes(): void {
  void import('./features/articles/articles.routes');
  void import('./features/articles/pages/article-list/article-list');
  void import('./features/articles/pages/article-detail/article-detail');
}
