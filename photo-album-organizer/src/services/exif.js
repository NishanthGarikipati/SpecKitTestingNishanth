/**
 * exifr wrapper for client-side capture-date extraction.
 * Works in the browser (Vite build) where exifr is bundled normally.
 */
import { parse } from 'exifr';

/**
 * Extract the DateTimeOriginal from a File object.
 * Returns an ISO 8601 string, or null if unavailable.
 */
export async function getCaptureDate(file) {
  try {
    const exif = await parse(file, { DateTimeOriginal: true });
    if (exif && exif.DateTimeOriginal instanceof Date) {
      return exif.DateTimeOriginal.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Return an ISO date string for the file:
 * - EXIF DateTimeOriginal if available
 * - file.lastModified as fallback
 */
export async function getEffectiveDate(file) {
  const exifDate = await getCaptureDate(file);
  if (exifDate) return exifDate;
  return new Date(file.lastModified).toISOString();
}
