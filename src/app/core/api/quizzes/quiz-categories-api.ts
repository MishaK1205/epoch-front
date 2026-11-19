import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateQuizCategoryRequest,
  QuizCategory,
  UpdateQuizCategoryRequest,
} from './quizzes.models';

/**
 * Quiz categories (admin-only). Separate from article, flashcard and "What? Where? When?"
 * categories: own endpoint, one level of subcategories, own slugs.
 */
@Injectable({ providedIn: 'root' })
export class QuizCategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/quiz-categories`;

  /** Top-level categories only (subcategories nested), sorted by name. Not paginated. */
  list(): Observable<QuizCategory[]> {
    return this.http.get<QuizCategory[]>(this.baseUrl);
  }

  getBySlug(slug: string): Observable<QuizCategory> {
    return this.http.get<QuizCategory>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  create(body: CreateQuizCategoryRequest): Observable<QuizCategory> {
    return this.http.post<QuizCategory>(this.baseUrl, body);
  }

  /** Name and/or description only. Never send `parentId`. */
  update(id: string, body: UpdateQuizCategoryRequest): Observable<QuizCategory> {
    return this.http.patch<QuizCategory>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** 204. 409 while the category still has subcategories or quizzes. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
