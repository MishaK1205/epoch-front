import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role-guard';
import { ManageShell } from './components/manage-shell/manage-shell';
import { unsavedChangesGuard } from './unsaved-changes-guard';

export const MANAGE_ROUTES: Routes = [
  {
    path: 'manage',
    canActivate: [roleGuard('moderator', 'admin')],
    component: ManageShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'articles' },
      {
        path: 'articles',
        title: 'სტატიების მართვა — Epoch',
        loadComponent: () =>
          import('./pages/manage-articles/manage-articles').then((m) => m.ManageArticles),
      },
      {
        path: 'articles/new',
        title: 'ახალი სტატია — Epoch',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/article-editor/article-editor').then((m) => m.ArticleEditor),
      },
      {
        path: 'articles/:id',
        title: 'სტატიის რედაქტირება — Epoch',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/article-editor/article-editor').then((m) => m.ArticleEditor),
      },
      {
        path: 'categories',
        title: 'კატეგორიები — Epoch',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./pages/manage-categories/manage-categories').then((m) => m.ManageCategories),
      },
      {
        path: 'users',
        title: 'მომხმარებლები — Epoch',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/manage-users/manage-users').then((m) => m.ManageUsers),
      },
      {
        path: 'what-where-when',
        canActivate: [roleGuard('admin')],
        children: [
          {
            path: '',
            title: 'რა? სად? როდის? — Epoch',
            loadComponent: () =>
              import('./pages/www-packages/www-packages').then((m) => m.WwwPackages),
          },
          {
            path: 'new',
            title: 'ახალი პაკეტი — Epoch',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./pages/www-package-editor/www-package-editor').then(
                (m) => m.WwwPackageEditor,
              ),
          },
          {
            path: 'categories',
            title: 'რა? სად? როდის? — კატეგორიები — Epoch',
            loadComponent: () =>
              import('./pages/www-categories/www-categories').then((m) => m.WwwCategories),
          },
          {
            path: ':id',
            title: 'რა? სად? როდის? — პაკეტი — Epoch',
            loadComponent: () =>
              import('./pages/www-package-view/www-package-view').then((m) => m.WwwPackageView),
          },
          {
            path: ':id/edit',
            title: 'პაკეტის რედაქტირება — Epoch',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./pages/www-package-editor/www-package-editor').then(
                (m) => m.WwwPackageEditor,
              ),
          },
        ],
      },
    ],
  },
];
