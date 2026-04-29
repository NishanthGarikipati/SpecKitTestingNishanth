import { describe, it, expect, vi } from 'vitest';
import * as exifr from 'exifr';
import { getCaptureDate, getEffectiveDate } from '../../src/services/exif.js';

vi.mock('exifr', () => ({
  parse: vi.fn(),
}));

describe('getCaptureDate', () => {
  it('returns ISO string when DateTimeOriginal is present', async () => {
    const date = new Date('2025-07-14T09:23:00');
    exifr.parse.mockResolvedValue({ DateTimeOriginal: date });

    const result = await getCaptureDate(new File([], 'photo.jpg'));
    expect(result).toBe(date.toISOString());
  });

  it('returns null when EXIF has no DateTimeOriginal', async () => {
    exifr.parse.mockResolvedValue({});

    const result = await getCaptureDate(new File([], 'photo.jpg'));
    expect(result).toBeNull();
  });

  it('returns null when exifr.parse returns null', async () => {
    exifr.parse.mockResolvedValue(null);

    const result = await getCaptureDate(new File([], 'photo.jpg'));
    expect(result).toBeNull();
  });

  it('returns null when exifr.parse throws', async () => {
    exifr.parse.mockRejectedValue(new Error('parse error'));

    const result = await getCaptureDate(new File([], 'photo.jpg'));
    expect(result).toBeNull();
  });
});

describe('getEffectiveDate', () => {
  it('returns EXIF date when available', async () => {
    const date = new Date('2025-07-14T09:23:00');
    exifr.parse.mockResolvedValue({ DateTimeOriginal: date });

    const file = new File([], 'photo.jpg', { lastModified: Date.now() });
    const result = await getEffectiveDate(file);
    expect(result).toBe(date.toISOString());
  });

  it('falls back to file lastModified when EXIF is null', async () => {
    exifr.parse.mockResolvedValue(null);

    const lastModified = new Date('2026-01-01T00:00:00').getTime();
    const file = new File([], 'photo.jpg', { lastModified });
    const result = await getEffectiveDate(file);
    expect(result).toBe(new Date(lastModified).toISOString());
  });
});
