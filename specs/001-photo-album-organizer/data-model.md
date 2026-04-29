# Data Model: Photo Album Organizer

**Feature**: `001-photo-album-organizer`  
**Date**: 2026-04-29  
**Storage**: SQLite (`./data/photo-organizer.db`)

---

## Entities

### Album

Represents a named container for a flat collection of photos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal unique identifier |
| `name` | `TEXT` | `NOT NULL` | User-provided album name |
| `cover_photo_id` | `INTEGER` | `REFERENCES photos(id) ON DELETE SET NULL` | FK to the cover photo; `NULL` = use first photo |
| `date_label` | `TEXT` | `NOT NULL` | ISO date string (`YYYY-MM` or `YYYY`) used for grouping on the main page; derived from the earliest/most-recent photo capture date |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | User-defined display position (drag-and-drop persistence); lower values appear first |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (datetime('now'))` | ISO 8601 timestamp of album creation |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT (datetime('now'))` | ISO 8601 timestamp of last modification |

**Indexes**:
- `idx_albums_sort_order` on `(sort_order)`
- `idx_albums_date_label` on `(date_label)`

**Validation rules**:
- `name` MUST NOT be empty or whitespace-only.
- `sort_order` values MUST be unique; reassigned atomically on drag-and-drop reorder.
- `date_label` is re-computed whenever photos are added to or removed from the album.

**State transitions**:
- Created (empty) → Photos added → Active
- Active → All photos removed → Empty (album still exists)
- Active / Empty → Deleted (CASCADE removes associated photos rows, NOT the image files)

---

### Photo

Represents a reference to a single image file stored on the user's local filesystem.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal unique identifier |
| `album_id` | `INTEGER` | `NOT NULL REFERENCES albums(id) ON DELETE CASCADE` | The album this photo belongs to |
| `file_path` | `TEXT` | `NOT NULL` | Absolute path to the image file on disk |
| `filename` | `TEXT` | `NOT NULL` | Original filename (display purposes) |
| `capture_date` | `TEXT` | `NULL` | ISO 8601 date extracted from EXIF `DateTimeOriginal`; `NULL` if unavailable |
| `fallback_date` | `TEXT` | `NOT NULL` | File `lastModified` date (ISO 8601); used when `capture_date` IS NULL |
| `mime_type` | `TEXT` | `NOT NULL` | MIME type of the image file (e.g., `image/jpeg`, `image/png`, `image/webp`) |
| `added_at` | `TEXT` | `NOT NULL DEFAULT (datetime('now'))` | ISO 8601 timestamp when the photo was added to the album |

**Indexes**:
- `idx_photos_album_id` on `(album_id)`
- `idx_photos_file_path` on `(file_path)` — supports duplicate detection within an album

**Validation rules**:
- `file_path` MUST resolve to an existing file at write time; the server validates presence and MIME type.
- `mime_type` MUST be one of: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/avif`.
- Duplicate `file_path` within the same `album_id` is rejected (`UNIQUE(album_id, file_path)`).
- Deleting a photo row does NOT delete the image file from disk.

---

## Relationships

```
Album (1) ──── (many) Photo
  └── cover_photo_id (FK, optional) ──▷ Photo
```

- One album contains zero or more photos.
- One photo belongs to exactly one album (flat hierarchy; no nesting).
- `cover_photo_id` is a nullable self-referencing FK back to the `photos` table; it points to the
  designated cover image for the album tile. When `NULL`, the server resolves the first photo
  (by `added_at ASC`) as the effective cover at query time.

---

## Effective Date Logic

The album's `date_label` is a derived value updated server-side after every photo insert or delete:

```sql
-- Recompute date_label after photo change
UPDATE albums
SET date_label = COALESCE(
    (SELECT substr(COALESCE(p.capture_date, p.fallback_date), 1, 7)   -- 'YYYY-MM'
     FROM photos p
     WHERE p.album_id = :album_id
     ORDER BY COALESCE(p.capture_date, p.fallback_date) DESC
     LIMIT 1),
    strftime('%Y-%m', 'now')
)
WHERE id = :album_id;
```

`date_label` granularity is `YYYY-MM` for grouping on the main page. Grouping header displayed in the UI (e.g., "April 2026") is derived by formatting `date_label` client-side.

---

## Schema DDL

```sql
CREATE TABLE IF NOT EXISTS albums (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL CHECK(length(trim(name)) > 0),
    cover_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
    date_label    TEXT    NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
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

CREATE INDEX IF NOT EXISTS idx_albums_sort_order  ON albums(sort_order);
CREATE INDEX IF NOT EXISTS idx_albums_date_label  ON albums(date_label);
CREATE INDEX IF NOT EXISTS idx_photos_album_id    ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_file_path   ON photos(file_path);
```
