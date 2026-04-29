import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { buildApp } from '../../server/index.js';
import { initDb } from '../../server/db.js';

let app;
let db;
let tmpDir;

beforeEach(async () => {
  tmpDir = join(os.tmpdir(), `image-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  db = initDb(':memory:');
  app = await buildApp(db);
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('GET /api/image', () => {
  it('streams a valid image file with correct Content-Type', async () => {
    const file = join(tmpDir, 'valid.jpg');
    writeFileSync(file, 'fake jpeg data');

    const res = await app.inject({
      method: 'GET',
      url: `/api/image?path=${encodeURIComponent(file)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
  });

  it('returns 400 for path traversal attempt', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/image?path=${encodeURIComponent('../../../etc/passwd')}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/traversal/i);
  });

  it('returns 400 for path containing null byte', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/image?path=${encodeURIComponent('/tmp/file\0.jpg')}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/null byte/i);
  });

  it('returns 400 for disallowed file extension', async () => {
    const file = join(tmpDir, 'script.sh');
    writeFileSync(file, '#!/bin/sh');

    const res = await app.inject({
      method: 'GET',
      url: `/api/image?path=${encodeURIComponent(file)}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/not allowed/i);
  });

  it('returns 404 for non-existent file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/image?path=${encodeURIComponent(join(tmpDir, 'missing.jpg'))}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when path query param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/image' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/path/i);
  });
});
