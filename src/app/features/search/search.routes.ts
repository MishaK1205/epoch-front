import { Routes } from '@angular/router';

/** Search results: `/search?q=<text>&page=<n>`. Admin only (the parent route). */
export const SEARCH_ROUTES: Routes = [
  {
    path: 'search',
    title: 'ძიება — Epoch',
    loadComponent: () =>
      import('./pages/search-results/search-results').then((m) => m.SearchResults),
  },
];
