import { describe, expect, it } from 'vitest';
import { isAllowed, parseAllowlist } from './allowlist';

describe('parseAllowlist', () => {
  it('parses a comma-separated list with spaces', () => {
    expect(parseAllowlist(' 123, 456 ,789')).toEqual(new Set([123, 456, 789]));
  });
  it('ignores empty entries and garbage', () => {
    expect(parseAllowlist('123,,abc,12.5,')).toEqual(new Set([123]));
  });
  it('returns an empty set for an empty string', () => {
    expect(parseAllowlist('').size).toBe(0);
  });
});

describe('isAllowed', () => {
  const list = parseAllowlist('123,456');
  it('allows listed users', () => {
    expect(isAllowed(123, list)).toBe(true);
  });
  it('rejects unlisted users', () => {
    expect(isAllowed(999, list)).toBe(false);
  });
  it('rejects missing user ids (channel posts etc.)', () => {
    expect(isAllowed(undefined, list)).toBe(false);
  });
  it('rejects everyone when the allowlist is empty', () => {
    expect(isAllowed(123, new Set())).toBe(false);
  });
});
