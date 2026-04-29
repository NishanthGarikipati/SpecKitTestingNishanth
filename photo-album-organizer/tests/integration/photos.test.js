import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { buildApp } from '../../server/index.js';
import { initDb } from '../../server/db.js';

let app;
let db;
let tmpDir;
let albumId;

beforeEach(async () => {
  tmpDir = join(os.tmpdir(), `photos-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  db = initDb(':memory:');
  app = await buildApp(db);
  await app.ready();

  // Create a test album
  const res = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'Test Album' } });
  albumId = res.json().id;
});

afterEach(async () => {
  await app.close();
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeFile(name) {
  const path = join(tmpDir, name);
  writeFileSync(path, 'fake image data');
  return path;
}

const VALID_PHOTO = (file_path) => ({
  file_path,
  filename: 'photo.jpg',
  capture_date: '2025-07-14T09:23:00.000Z',
  fallback_date: '2026-04-29T08:00:00.000Z',
  mime_type: 'image/jpeg',
});

// ---- POST /api/albums/:id/photos ----

describe('POST /api/albums/:id/photos', () => {
  it('adds a valid photo and returns 201', async () => {
    const file_path = makeFile('photo.jpg');
    const res = await app.inject({
      method: 'POST',
      url: `/api/albums/${albumId}/photos`,
      body: { photos: [VALID_PHOTO(file_path)] },
    });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.added).toBe(1);
    expect(json.skipped_duplicates).toBe(0);
    expect(json.photos[0].filename).toBe('photo.jpg');
    expect(json.photos[0].thumbnail_url).toContain('/api/image?path=');
  });

  it('rejects disallowed MIME type', async () => {
    const file_path = makeFile('virus.exe');
    const res = await app.inject({
      method: 'POST',
      url: `/api/albums/${albumId}/photos`,
      body: {
        photos: [{
          file_path,
          filename: 'virus.exe',
          fallback_date: '2026-04-29T00:00:00Z',
          mime_type: 'application/octet-stream',
        }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/not allowed/i);
  });

  it('skips duplicate file paths silently', async () => {
    const file_path = makeFile('dup.jpg');
    const body = { photos: [VALID_PHOTO(file_path)] };

    await app.inject({ method: 'POST', url: `/api/albums/${albumId}/photos`, body });
    const res = await app.inject({ method: 'POST', url: `/api/albums/${albumId}/photos`, body });

    expect(res.statusCode).toBe(201);
    expect(res.json().skipped_duplicates).toBe(1);
    expect(res.json().added).toBe(0);
  });

  it('returns 404 for missing album', async () => {
    const file_path = makeFile('x.jpg');
    const res = await app.inject({
      method: 'POST',
      url: '/api/albums/9999/photos',
      body: { photos: [VALID_PHOTO(file_path)] },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ---- GET /api/albums/:id/photos ----

describe('GET /api/albums/:id/photos', () => {
  it('returns photos ordered by date', async () => {
    const f1 = makeFile('old.jpg');
    const f2 = makeFile('new.jpg');

    await app.inject({
      method: 'POST', url: `/api/albums/${albumId}/photos`,
      body: { photos: [
        { file_path: f1, filename: 'old.jpg', capture_date: '2024-01-01T00:00:00Z', fallback_date: '2024-01-01T00:00:00Z', mime_type: 'image/jpeg' },
        { file_path: f2, filename: 'new.jpg', capture_date: '2025-06-01T00:00:00Z', fallback_date: '2025-06-01T00:00:00Z', mime_type: 'image/jpeg' },
      ]},
    });

    const res = await app.inject({ method: 'GET', url: `/api/albums/${albumId}/photos` });
    expect(res.statusCode).toBe(200);
    const photos = res.json();
    expect(photos[0].filename).toBe('old.jpg');
    expect(photos[1].filename).toBe('new.jpg');
  });

  it('includes thumbnail_url', async () => {
    const file_path = makeFile('thumb.jpg');
    await app.inject({
      method: 'POST', url: `/api/albums/${albumId}/photos`,
      body: { photos: [VALID_PHOTO(file_path)] },
    });

    const res = await app.inject({ method: 'GET', url: `/api/albums/${albumId}/photos` });
    expect(res.json()[0].thumbnail_url).toMatch(/^\/api\/image\?path=/);
  });

  it('returns 404 for missing album', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/albums/9999/photos' });
    expect(res.statusCode).toBe(404);
  });
});
