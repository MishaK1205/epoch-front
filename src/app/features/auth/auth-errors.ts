import { getApiErrorMessages } from '../../core/api/api-error-messages';

const TRANSLATIONS: Partial<Record<string, string>> = {
  'Invalid credentials': 'მომხმარებლის სახელი, ელ-ფოსტა ან პაროლი არასწორია.',
  'Username is already taken': 'ეს მომხმარებლის სახელი უკვე დაკავებულია.',
  'Email is already registered': 'ეს ელ-ფოსტა უკვე დარეგისტრირებულია.',
  'Username and email are already taken': 'მომხმარებლის სახელი და ელ-ფოსტა უკვე დაკავებულია.',
};

/** API error → Georgian messages for the auth forms (unknown messages are shown as-is). */
export function getAuthErrorMessages(err: unknown): string[] {
  return getApiErrorMessages(err).map((message) => TRANSLATIONS[message] ?? message);
}

/** Only allow internal paths as post-login redirects (prevents open redirects). */
export function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
