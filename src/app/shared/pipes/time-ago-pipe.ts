import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const dateFormat = new Intl.DateTimeFormat('ka-GE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * ISO date → relative Georgian time for the last week ("3 საათის წინ"), otherwise a full date
 * ("1 ოქტომბერი, 2026"). `{{ article.publishedAt | timeAgo }}`
 */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const time = date.getTime();
    if (Number.isNaN(time)) {
      return '';
    }
    const diff = Date.now() - time;
    if (diff < MINUTE) {
      return 'ახლახან';
    }
    if (diff < HOUR) {
      return `${Math.floor(diff / MINUTE)} წუთის წინ`;
    }
    if (diff < DAY) {
      return `${Math.floor(diff / HOUR)} საათის წინ`;
    }
    if (diff < WEEK) {
      return `${Math.floor(diff / DAY)} დღის წინ`;
    }
    return dateFormat.format(date);
  }
}
