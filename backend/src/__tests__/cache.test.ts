import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cache } from '../cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    // Reset by setting expired entries
    vi.restoreAllMocks();
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves values', () => {
    cache.set('test-key', { value: 42 }, 60_000);
    expect(cache.get('test-key')).toEqual({ value: 42 });
  });

  it('returns null for expired entries', () => {
    vi.useFakeTimers();
    cache.set('expire-key', 'hello', 100);
    expect(cache.get('expire-key')).toBe('hello');

    vi.advanceTimersByTime(200);
    expect(cache.get('expire-key')).toBeNull();

    vi.useRealTimers();
  });

  it('different keys do not interfere', () => {
    cache.set('key-a', 'alpha', 60_000);
    cache.set('key-b', 'beta', 60_000);
    expect(cache.get('key-a')).toBe('alpha');
    expect(cache.get('key-b')).toBe('beta');
  });

  it('overwrites existing keys', () => {
    cache.set('overwrite', 'first', 60_000);
    cache.set('overwrite', 'second', 60_000);
    expect(cache.get('overwrite')).toBe('second');
  });
});
