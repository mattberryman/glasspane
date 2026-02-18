import { describe, it, expect } from 'vitest';
import { UploadSchema } from '../src/schema';

describe('UploadSchema', () => {
  it('accepts valid content within size limit', () => {
    const result = UploadSchema.safeParse({ content: 'Hello world.' });
    expect(result.success).toBe(true);
  });

  it('accepts content exactly at 100,000 characters', () => {
    const result = UploadSchema.safeParse({ content: 'a'.repeat(100_000) });
    expect(result.success).toBe(true);
  });

  it('rejects content over 100,000 characters', () => {
    const result = UploadSchema.safeParse({ content: 'a'.repeat(100_001) });
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = UploadSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing content field', () => {
    const result = UploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string content', () => {
    const result = UploadSchema.safeParse({ content: 42 });
    expect(result.success).toBe(false);
  });
});
