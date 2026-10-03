import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Paginated } from '../../../shared/models/paginated';
import { ClientValidationError } from '../client-validation-error';
import { toHttpParams } from '../http-params';
import { validateImageFile } from './image-file';
import { ListImagesQuery, UpdateImageRequest, UploadedImage } from './images.models';

@Injectable({ providedIn: 'root' })
export class ImagesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/images`;

  /**
   * Moderator or admin. Fails with `ClientValidationError` (no request sent) if the file type
   * or size is not allowed.
   */
  upload(file: File, alt?: string): Observable<UploadedImage> {
    const error = validateImageFile(file);
    if (error) {
      return throwError(() => new ClientValidationError(error));
    }
    return this.http.post<UploadedImage>(this.baseUrl, this.toFormData(file, alt));
  }

  /** Moderator or admin. Same as `upload()`, but emits upload progress events. */
  uploadWithProgress(file: File, alt?: string): Observable<HttpEvent<UploadedImage>> {
    const error = validateImageFile(file);
    if (error) {
      return throwError(() => new ClientValidationError(error));
    }
    return this.http.post<UploadedImage>(this.baseUrl, this.toFormData(file, alt), {
      reportProgress: true,
      observe: 'events',
    });
  }

  /** Moderator or admin; moderators only see their own images. */
  list(query: ListImagesQuery = {}): Observable<Paginated<UploadedImage>> {
    return this.http.get<Paginated<UploadedImage>>(this.baseUrl, { params: toHttpParams(query) });
  }

  /** Moderator or admin. */
  get(id: string): Observable<UploadedImage> {
    return this.http.get<UploadedImage>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Owner (moderator) or admin. */
  updateAlt(id: string, alt: string): Observable<UploadedImage> {
    const body: UpdateImageRequest = { alt };
    return this.http.patch<UploadedImage>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** Owner (moderator) or admin. 409 while the image is used by an article. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** No Content-Type header is set: the browser adds the multipart boundary. */
  private toFormData(file: File, alt?: string): FormData {
    const formData = new FormData();
    formData.append('file', file);
    if (alt !== undefined) {
      formData.append('alt', alt);
    }
    return formData;
  }
}
