import { Routes } from '@angular/router';

/** Public search results: `/search?q=<text>&page=<n>`. */
export const SEARCH_ROUTES: Routes = [
  {
    path: 'search',
    title: 'ძიება — Epoch',
    loadComponent: () =>
      import('./pages/search-results/search-results').then((m) => m.SearchResults),
  },
];
