import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role-guard';

/** `/quizzes`: browse quizzes and play one. Admin only, outside `/manage`. */
export const QUIZ_ROUTES: Routes = [
  {
    path: 'quizzes',
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: '',
        title: 'ქვიზები — Epoch',
        loadComponent: () => import('./pages/quiz-browse/quiz-browse').then((m) => m.QuizBrowse),
      },
      {
        path: ':id',
        title: 'ქვიზი — Epoch',
        loadComponent: () => import('./pages/quiz-play/quiz-play').then((m) => m.QuizPlay),
      },
    ],
  },
];
