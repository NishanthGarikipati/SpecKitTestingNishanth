import { statSync } from 'fs';
import { resolve, extname } from 'path';

const ALLOWED_MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heic',
  '.avif': 'image/avif',
};

/**
 * Validate that rawPath is a safe, readable image file path.
 * Throws an Error with a descriptive message on any failure.
 * Returns { absolutePath, mimeType } on success.
 */
export function validateImagePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error('Path is required.');
  }

  // Reject null bytes
  if (rawPath.includes('\0')) {
    throw new Error('Invalid path: null byte detected.');
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    throw new Error('Invalid path encoding.');
  }

  // Reject path traversal sequences
  if (decoded.includes('..')) {
    throw new Error('Invalid path: directory traversal is not allowed.');
  }

  const absolutePath = resolve(decoded);

  // Check extension against allow-list
  const ext = extname(absolutePath).toLowerCase();
  const mimeType = ALLOWED_MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error(`File type not allowed: ${ext || '(no extension)'}`);
  }

  // Verify the file exists and is a regular file
  let stat;
  try {
    stat = statSync(absolutePath);
  } catch {
    throw new Error('File not found or not accessible.');
  }

  if (!stat.isFile()) {
    throw new Error('Path does not point to a regular file.');
  }

  return { absolutePath, mimeType };
}
