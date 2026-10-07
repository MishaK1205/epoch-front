import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role-guard';

/** `/what-where-when`: "რა? სად? როდის?" packages and their questions, for admins only. */
export const WHAT_WHERE_WHEN_ROUTES: Routes = [
  {
    path: 'what-where-when',
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: '',
        title: 'რა? სად? როდის? — Epoch',
        loadComponent: () => import('./pages/package-list/package-list').then((m) => m.PackageList),
      },
      {
        path: ':id',
        title: 'რა? სად? როდის? — კითხვები — Epoch',
        loadComponent: () =>
          import('./pages/package-questions/package-questions').then((m) => m.PackageQuestions),
      },
    ],
  },
];
