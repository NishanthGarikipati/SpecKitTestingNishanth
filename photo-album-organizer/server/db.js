import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS albums (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL CHECK(length(trim(name)) > 0),
  cover_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
  date_label     TEXT    NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id      INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  file_path     TEXT    NOT NULL,
  filename      TEXT    NOT NULL,
  capture_date  TEXT,
  fallback_date TEXT    NOT NULL,
  mime_type     TEXT    NOT NULL,
  added_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(album_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_albums_sort_order ON albums(sort_order);
CREATE INDEX IF NOT EXISTS idx_albums_date_label  ON albums(date_label);
CREATE INDEX IF NOT EXISTS idx_photos_album_id    ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_file_path   ON photos(file_path);
`;

let db;

export function getDb() {
  return db;
}

export function initDb(dbPath) {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
