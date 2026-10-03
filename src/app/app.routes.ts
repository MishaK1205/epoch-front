import { Routes } from '@angular/router';
import { MainLayout } from './core/layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Epoch — ისტორია, ფაქტები და საინტერესო ამბები',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'category/:slug',
        title: 'კატეგორია — Epoch',
        loadComponent: () =>
          import('./features/home/pages/category-articles/category-articles').then(
            (m) => m.CategoryArticles,
          ),
      },
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/articles/articles.routes').then((m) => m.ARTICLES_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./features/manage/manage.routes').then((m) => m.MANAGE_ROUTES),
      },
      {
        path: '**',
        title: 'გვერდი ვერ მოიძებნა — Epoch',
        loadComponent: () =>
          import('./features/not-found/pages/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
