import { describe, it, expect } from 'vitest';
import { sha256 } from './hash';

describe('sha256', () => {
  it('returns a 64-character hex string', () => {
    const result = sha256('hello');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns consistent hash for same input', () => {
    expect(sha256('test content')).toBe(sha256('test content'));
  });

  it('returns different hashes for different inputs', () => {
    expect(sha256('hello')).not.toBe(sha256('world'));
  });

  it('handles empty string', () => {
    const result = sha256('');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces known hash for "hello"', () => {
    // Well-known SHA-256 of "hello"
    expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
