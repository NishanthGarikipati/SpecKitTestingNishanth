import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { validateImagePath } from '../../server/lib/pathValidator.js';

let tmpDir;

beforeEach(() => {
  tmpDir = join(os.tmpdir(), `pathval-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

describe('validateImagePath', () => {
  it('accepts a valid JPEG file', () => {
    const file = join(tmpDir, 'photo.jpg');
    writeFileSync(file, 'fake');
    const result = validateImagePath(file);
    expect(result.absolutePath).toBe(file);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('accepts .png, .webp, .heic, .avif', () => {
    for (const [ext, mime] of [
      ['.png', 'image/png'],
      ['.webp', 'image/webp'],
      ['.heic', 'image/heic'],
      ['.avif', 'image/avif'],
    ]) {
      const file = join(tmpDir, `photo${ext}`);
      writeFileSync(file, 'fake');
      const result = validateImagePath(file);
      expect(result.mimeType).toBe(mime);
    }
  });

  it('rejects path traversal with ..', () => {
    expect(() => validateImagePath('../etc/passwd')).toThrow(/traversal/i);
  });

  it('rejects paths containing null bytes', () => {
    expect(() => validateImagePath('/tmp/photo\0.jpg')).toThrow(/null byte/i);
  });

  it('rejects disallowed file extensions', () => {
    const file = join(tmpDir, 'virus.exe');
    writeFileSync(file, 'fake');
    expect(() => validateImagePath(file)).toThrow(/not allowed/i);
  });

  it('rejects non-existent files', () => {
    expect(() => validateImagePath(join(tmpDir, 'missing.jpg'))).toThrow(/not found/i);
  });

  it('rejects empty or missing path', () => {
    expect(() => validateImagePath('')).toThrow();
    expect(() => validateImagePath(null)).toThrow();
  });

  it('handles URI-encoded paths', () => {
    const file = join(tmpDir, 'my photo.jpg');
    writeFileSync(file, 'fake');
    const encoded = encodeURIComponent(file);
    const result = validateImagePath(encoded);
    expect(result.absolutePath).toBe(file);
  });
});
