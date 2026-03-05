import { describe, it, expect } from 'vitest';
import { sha256Browser } from '../../src/services/contentHash';

describe('sha256Browser', () => {
  it('returns a 64-character hex string', async () => {
    const result = await sha256Browser('hello');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns consistent hash for same input', async () => {
    const a = await sha256Browser('test content');
    const b = await sha256Browser('test content');
    expect(a).toBe(b);
  });

  it('produces same hash as Node.js crypto', async () => {
    // Well-known SHA-256 of "hello"
    const result = await sha256Browser('hello');
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('handles empty string', async () => {
    const result = await sha256Browser('');
    expect(result).toHaveLength(64);
  });
});
