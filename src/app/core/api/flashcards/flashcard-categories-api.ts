import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateFlashcardCategoryRequest,
  FlashcardCategory,
  UpdateFlashcardCategoryRequest,
} from './flashcards.models';

/**
 * Flashcard decks (admin-only). Separate from the article `CategoriesApi` and from
 * `WhatWhereWhenCategoriesApi`: own endpoint, one level of subcategories, own slugs.
 */
@Injectable({ providedIn: 'root' })
export class FlashcardCategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/flashcard-categories`;

  /** Top-level categories only (subcategories nested), sorted by name. Not paginated. */
  list(): Observable<FlashcardCategory[]> {
    return this.http.get<FlashcardCategory[]>(this.baseUrl);
  }

  /** A category or a subcategory. The slug is encoded (Georgian slugs included). */
  getBySlug(slug: string): Observable<FlashcardCategory> {
    return this.http.get<FlashcardCategory>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  create(body: CreateFlashcardCategoryRequest): Observable<FlashcardCategory> {
    return this.http.post<FlashcardCategory>(this.baseUrl, body);
  }

  /** Name and/or description only. Never send `parentId`. */
  update(id: string, body: UpdateFlashcardCategoryRequest): Observable<FlashcardCategory> {
    return this.http.patch<FlashcardCategory>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** 204. 409 while the category still has subcategories or cards. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
