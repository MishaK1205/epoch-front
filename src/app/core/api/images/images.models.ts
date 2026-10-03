export interface ImageSummary {
  id: string;
  /** Absolute, publicly accessible URL. Use directly in `<img src>`. */
  url: string;
  alt?: string;
}

export interface UploadedImage extends ImageSummary {
  filename: string;
  /** 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' */
  mimeType: string;
  /** Bytes. */
  size: number;
  /** User id of the uploader. */
  uploadedBy: string;
  createdAt: string;
}

/** PATCH /images/:id */
export interface UpdateImageRequest {
  /** Max 200; '' clears it. */
  alt: string;
}

/** GET /images */
export interface ListImagesQuery {
  page?: number;
  limit?: number;
}
