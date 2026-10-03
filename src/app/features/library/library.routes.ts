import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth-guard';

/** The logged-in user's personal lists: `/me/saved` and `/me/read`. */
export const LIBRARY_ROUTES: Routes = [
  {
    path: 'me',
    canActivate: [authGuard],
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
