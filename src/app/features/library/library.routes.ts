import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role-guard';

/** The signed-in admin's lists: `/me/saved` and `/me/read`. The user id comes from the token. */
export const LIBRARY_ROUTES: Routes = [
  {
    path: 'me',
    canActivate: [roleGuard('admin')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'saved' },
      {
        path: 'saved',
        title: 'შენახული სტატიები — Epoch',
        data: { kind: 'saved' },
        loadComponent: () => import('./pages/reading-list/reading-list').then((m) => m.ReadingList),
      },
      {
        path: 'read',
        title: 'წაკითხული სტატიები — Epoch',
        data: { kind: 'read' },
        loadComponent: () => import('./pages/reading-list/reading-list').then((m) => m.ReadingList),
      },
    ],
  },
];
