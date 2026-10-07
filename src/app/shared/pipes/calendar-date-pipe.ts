import { Pipe, PipeTransform } from '@angular/core';
import { parseLocalDate } from '../utils/local-date';

const dateFormat = new Intl.DateTimeFormat('ka-GE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Calendar date `YYYY-MM-DD` → Georgian full date ("7 ოქტომბერი, 2026"), read in local time so
 * the day never shifts. Invalid values are returned unchanged. `{{ pkg.date | calendarDate }}`
 */
@Pipe({ name: 'calendarDate' })
export class CalendarDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = parseLocalDate(value);
    return date ? dateFormat.format(date) : value;
  }
}
