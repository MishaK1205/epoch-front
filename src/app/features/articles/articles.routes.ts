import { Routes } from '@angular/router';

export const ARTICLES_ROUTES: Routes = [
  {
    path: 'articles/:slug',
    title: 'სტატია — Epoch',
    loadComponent: () =>
      import('./pages/article-detail/article-detail').then((m) => m.ArticleDetail),
  },
];
