import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { API_GET_CACHE } from '../../interceptors/api-get-cache-interceptor';
import { toHttpParams } from '../http-params';
import {
  CreateQuizRequest,
  ListQuizzesQuery,
  PlayQuizQuery,
  Quiz,
  QuizAttempt,
  QuizPlay,
  QuizSummary,
  SubmitQuizAttemptRequest,
  UpdateQuizRequest,
} from './quizzes.models';

/** `direct` and `shuffle` are sent only when `true`. */
function withoutFalse<T extends object>(query: T, key: keyof T): T {
  if (query[key] === true) {
    return query;
  }
  const copy = { ...query };
  delete copy[key];
  return copy;
}

/** Admin quizzes. Every endpoint requires the admin role. */
@Injectable({ providedIn: 'root' })
export class QuizzesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/quizzes`;

  /** Newest first, with the current admin's `myStats`. */
  list(query: ListQuizzesQuery = {}): Observable<Paginated<QuizSummary>> {
    return this.http.get<Paginated<QuizSummary>>(this.baseUrl, {
      params: toHttpParams(withoutFalse(query, 'direct')),
    });
  }

  /** Includes the answer key. Editor only — the play screen uses `play()`. */
  get(id: string): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /**
   * Questions without correct answers. Never cached: every play may shuffle or pick a
   * different subset. 400 `Quiz has no questions yet`.
   */
  play(id: string, query: PlayQuizQuery = {}): Observable<QuizPlay> {
    return this.http.get<QuizPlay>(`${this.baseUrl}/${encodeURIComponent(id)}/play`, {
      params: toHttpParams(withoutFalse(query, 'shuffle')),
      context: new HttpContext().set(API_GET_CACHE, false),
    });
  }

  create(body: CreateQuizRequest): Observable<Quiz> {
    return this.http.post<Quiz>(this.baseUrl, body);
  }

  /** `questions`, when sent, replaces the whole list; send `id` to keep a question. */
  update(id: string, body: UpdateQuizRequest): Observable<Quiz> {
    return this.http.patch<Quiz>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** 204. Also deletes every admin's attempts at it. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Graded on the server. 201 with the score and the correct answers. */
  submitAttempt(id: string, body: SubmitQuizAttemptRequest): Observable<QuizAttempt> {
    return this.http.post<QuizAttempt>(`${this.baseUrl}/${encodeURIComponent(id)}/attempts`, body);
  }

  /** The current admin's attempts, newest first. */
  listAttempts(
    id: string,
    query: { page?: number; limit?: number } = {},
  ): Observable<Paginated<QuizAttempt>> {
    return this.http.get<Paginated<QuizAttempt>>(
      `${this.baseUrl}/${encodeURIComponent(id)}/attempts`,
      { params: toHttpParams(query) },
    );
  }
}
