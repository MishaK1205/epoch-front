import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role-guard';

/** `/flashcards`: pick a category and study it. Admin only, outside `/manage`. */
export const FLASHCARD_ROUTES: Routes = [
  {
    path: 'flashcards',
    canActivate: [roleGuard('admin')],
    title: 'ფლეშბარათები — Epoch',
    loadComponent: () =>
      import('./pages/flashcard-play/flashcard-play').then((m) => m.FlashcardPlay),
  },
];
