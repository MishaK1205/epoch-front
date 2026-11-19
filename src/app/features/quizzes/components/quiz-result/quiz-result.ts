import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuizAttempt, QuizPlayQuestion } from '../../../../core/api';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { formatDuration } from '../../pages/quiz-play/quiz-play-text';

interface ReviewRow {
  number: number;
  question: QuizPlayQuestion | null;
  selected: string | null;
  correct: string | null;
  isCorrect: boolean;
  explanation: string;
}

/** Score of a finished attempt and every answer with the correct one and its explanation. */
@Component({
  selector: 'app-quiz-result',
  imports: [RouterLink, Button, Icon],
  templateUrl: './quiz-result.html',
  styleUrl: './quiz-result.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizResult {
  readonly attempt = input.required<QuizAttempt>();
  /** The questions that were shown, to print their text and options. */
  readonly questions = input.required<readonly QuizPlayQuestion[]>();
  readonly playAgain = output<void>();

  protected readonly duration = computed(() => {
    const seconds = this.attempt().durationSeconds;
    return seconds === null ? '' : formatDuration(seconds);
  });
  protected readonly review = computed<ReviewRow[]>(() => {
    const byId = new Map(this.questions().map((item) => [item.id, item]));
    return this.attempt().answers.map((answer, index) => {
      const question = byId.get(answer.questionId) ?? null;
      const option = (at: number | null) =>
        question && at !== null ? (question.options[at] ?? null) : null;
      return {
        number: index + 1,
        question,
        selected: option(answer.selectedIndex),
        correct: option(answer.correctIndex),
        isCorrect: answer.correct,
        explanation: answer.explanation,
      };
    });
  });
}
