import { describe, expect, it } from 'vitest';
import { parseLocalDate, toLocalDateString } from './local-date';

describe('parseLocalDate', () => {
  it('parses a date as local midnight', () => {
    const date = parseLocalDate('2026-10-07');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(7);
    expect(date?.getHours()).toBe(0);
  });

  it('rejects impossible dates and other formats', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
    expect(parseLocalDate('07.10.2026')).toBeNull();
    expect(parseLocalDate('2024-02-29')).not.toBeNull();
  });
});

describe('toLocalDateString', () => {
  it('formats the local calendar date', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
