import { API_LIMITS } from '../api-limits';

const ALLOWED_IMAGE_TYPES: readonly string[] = API_LIMITS.image.types;

/** Value for `<input type="file" accept="...">`. */
export const IMAGE_FILE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

/** Returns an error message if the file can't be uploaded, otherwise `null`. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'სურათის ფორმატი არ არის მხარდაჭერილი. დაშვებულია: JPEG, PNG, WebP, GIF.';
  }
  if (file.size > API_LIMITS.image.maxSizeBytes) {
    return `სურათი ძალიან დიდია. მაქსიმალური ზომაა ${API_LIMITS.image.maxSizeBytes / (1024 * 1024)} MB.`;
  }
  return null;
}
