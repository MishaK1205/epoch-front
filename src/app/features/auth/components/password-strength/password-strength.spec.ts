import { describe, expect, it } from 'vitest';
import { scorePassword } from './password-strength';

describe('scorePassword', () => {
  it('returns 0 for an empty password', () => {
    expect(scorePassword('')).toBe(0);
  });

  it('rates short passwords without digits as weak', () => {
    expect(scorePassword('abc')).toBe(1);
  });

  it('rates a password that meets the server rules as at least medium', () => {
    expect(scorePassword('abcdefg1')).toBeGreaterThanOrEqual(2);
  });

  it('rates a long password with mixed case and symbols as strong', () => {
    expect(scorePassword('Correct-Horse-7Battery')).toBe(4);
  });
});
