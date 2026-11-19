import { Routes } from '@angular/router';
import { adminMatch, roleGuard } from './core/auth/role-guard';
import { MainLayout } from './core/layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'login',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
      {
        path: '',
        pathMatch: 'full',
        canMatch: [adminMatch],
        title: 'Epoch — ისტორია, ფაქტები და საინტერესო ამბები',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: '/login',
      },
      {
        path: '',
        canActivate: [roleGuard('admin')],
        children: [
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
            loadChildren: () =>
              import('./features/articles/articles.routes').then((m) => m.ARTICLES_ROUTES),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/manage/manage.routes').then((m) => m.MANAGE_ROUTES),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/library/library.routes').then((m) => m.LIBRARY_ROUTES),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/search/search.routes').then((m) => m.SEARCH_ROUTES),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/what-where-when/what-where-when.routes').then(
                (m) => m.WHAT_WHERE_WHEN_ROUTES,
              ),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/flashcards/flashcards.routes').then((m) => m.FLASHCARD_ROUTES),
          },
          {
            path: '',
            loadChildren: () =>
              import('./features/quizzes/quizzes.routes').then((m) => m.QUIZ_ROUTES),
          },
          {
            path: '**',
            title: 'გვერდი ვერ მოიძებნა — Epoch',
            loadComponent: () =>
              import('./features/not-found/pages/not-found/not-found').then((m) => m.NotFound),
          },
        ],
      },
    ],
  },
];
