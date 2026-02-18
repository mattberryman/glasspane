import { describe, it, expect } from 'vitest';
import { generateId } from '../src/id';

describe('generateId', () => {
  it('returns a 12-character string', () => {
    expect(generateId()).toHaveLength(12);
  });

  it('uses only alphanumeric characters', () => {
    expect(generateId()).toMatch(/^[a-zA-Z0-9]{12}$/);
  });

  it('generates unique IDs (10,000 samples, no collisions)', () => {
    const ids = new Set(Array.from({ length: 10_000 }, () => generateId()));
    expect(ids.size).toBe(10_000);
  });
});
