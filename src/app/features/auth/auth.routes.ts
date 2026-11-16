import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest-guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'შესვლა — Epoch',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
];
