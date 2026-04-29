import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { buildApp } from '../../server/index.js';
import { initDb } from '../../server/db.js';

let app;
let db;

beforeEach(async () => {
  // Use in-memory SQLite for each test
  db = initDb(':memory:');
  app = await buildApp(db);
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db.close();
});

// ---- POST /api/albums ----

describe('POST /api/albums', () => {
  it('creates an album and returns 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'Summer 2025' } });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.name).toBe('Summer 2025');
    expect(json.id).toBeTypeOf('number');
    expect(json.photo_count).toBe(0);
    expect(json.cover_url).toBeNull();
  });

  it('returns 400 for empty name', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/albums', body: { name: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/required/i);
  });

  it('returns 400 for whitespace-only name', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/albums', body: { name: '   ' } });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when name exceeds 255 characters', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'x'.repeat(256) } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/255/);
  });

  it('assigns sequential sort_order', async () => {
    await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'First' } });
    const res2 = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'Second' } });
    expect(res2.json().sort_order).toBe(1);
  });
});

// ---- DELETE /api/albums/:id ----

describe('DELETE /api/albums/:id', () => {
  it('deletes an existing album and returns 204', async () => {
    const create = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'Temp' } });
    const { id } = create.json();
    const res = await app.inject({ method: 'DELETE', url: `/api/albums/${id}` });
    expect(res.statusCode).toBe(204);
  });

  it('returns 404 for a non-existent album', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/albums/9999' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/not found/i);
  });
});

// ---- GET /api/albums ----

describe('GET /api/albums', () => {
  it('returns empty array when no albums exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/albums' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('returns albums ordered by sort_order', async () => {
    await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'A' } });
    await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'B' } });
    const res = await app.inject({ method: 'GET', url: '/api/albums' });
    const json = res.json();
    expect(json.length).toBe(2);
    expect(json[0].name).toBe('A');
    expect(json[1].name).toBe('B');
  });

  it('includes photo_count and null cover_url for empty albums', async () => {
    await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'Empty' } });
    const res = await app.inject({ method: 'GET', url: '/api/albums' });
    const [album] = res.json();
    expect(album.photo_count).toBe(0);
    expect(album.cover_url).toBeNull();
  });
});

// ---- PATCH /api/albums/order ----

describe('PATCH /api/albums/order', () => {
  it('reorders albums and persists new order', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'A' } });
    const r2 = await app.inject({ method: 'POST', url: '/api/albums', body: { name: 'B' } });
    const id1 = r1.json().id;
    const id2 = r2.json().id;

    const reorder = await app.inject({
      method: 'PATCH', url: '/api/albums/order', body: { order: [id2, id1] },
    });
    expect(reorder.statusCode).toBe(200);
    expect(reorder.json().updated).toBe(2);

    const list = await app.inject({ method: 'GET', url: '/api/albums' });
    const names = list.json().map((a) => a.name);
    expect(names).toEqual(['B', 'A']);
  });

  it('returns 400 for unknown album IDs', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/api/albums/order', body: { order: [9999] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/invalid/i);
  });
});
