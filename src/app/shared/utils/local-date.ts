const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `YYYY-MM-DD` → local midnight of that day, or `null` for a wrong format or an impossible date
 * (`2026-02-30`). Unlike `new Date('2026-10-07')` (UTC), this never shifts the day.
 */
export function parseLocalDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  date.setFullYear(year);
  const sameDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return sameDay ? date : null;
}

/** Local calendar date as `YYYY-MM-DD` (not `toISOString()`, which is UTC). */
export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
