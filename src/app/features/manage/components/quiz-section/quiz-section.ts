import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { QUIZ_CATEGORIES_URL, QUIZZES_URL } from '../../manage-labels';

/** Sub-navigation of `/manage/quizzes`: quizzes and categories. Playing is at `/quizzes`. */
@Component({
  selector: 'app-quiz-section',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './quiz-section.html',
  styleUrl: '../../manage-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSection {
  protected readonly quizzesUrl = QUIZZES_URL;
  protected readonly categoriesUrl = QUIZ_CATEGORIES_URL;
}
