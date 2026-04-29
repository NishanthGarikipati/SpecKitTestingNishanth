# API Contract: Photo Album Organizer

**Base URL (dev)**: `http://localhost:3001/api`  
**Base URL (prod)**: `/api` (same-origin, served by Node.js)  
**Format**: JSON (`Content-Type: application/json`) unless noted  
**Date format**: ISO 8601 strings throughout  

---

## Albums

### GET /api/albums

Return all albums ordered by `sort_order ASC`, with photo count and resolved cover image URL.

**Response 200**:
```json
[
  {
    "id": 1,
    "name": "Summer 2025",
    "date_label": "2025-07",
    "sort_order": 0,
    "photo_count": 42,
    "cover_url": "/api/image?path=%2FUsers%2Falice%2FPhotos%2FIMG_001.jpg",
    "created_at": "2026-04-29T10:00:00Z"
  }
]
```

---

### POST /api/albums

Create a new album.

**Request body**:
```json
{ "name": "Summer 2025" }
```

**Validation**:
- `name` required; non-empty after trim; max 255 characters.

**Response 201**:
```json
{ "id": 1, "name": "Summer 2025", "date_label": "2026-04", "sort_order": 0, "photo_count": 0, "cover_url": null, "created_at": "2026-04-29T10:00:00Z" }
```

**Response 400** (validation failure):
```json
{ "error": "Album name is required and must not be empty." }
```

---

### PATCH /api/albums/:id

Update an album's name or cover photo.

**Request body** (all fields optional):
```json
{ "name": "Renamed Album", "cover_photo_id": 7 }
```

**Response 200**: Updated album object (same shape as GET /api/albums item).  
**Response 404**: `{ "error": "Album not found." }`

---

### DELETE /api/albums/:id

Delete an album and all its photo records (cascade). Image files on disk are NOT deleted.

**Response 204**: No body.  
**Response 404**: `{ "error": "Album not found." }`

---

### PATCH /api/albums/order

Persist drag-and-drop reorder. Accepts an ordered array of album IDs; server assigns sequential `sort_order` values in a single transaction.

**Request body**:
```json
{ "order": [3, 1, 5, 2, 4] }
```

**Validation**:
- `order` must be a non-empty array of integers.
- All IDs must correspond to existing albums.

**Response 200**:
```json
{ "updated": 5 }
```

**Response 400**: `{ "error": "Invalid album ID(s) in order array." }`

---

## Photos

### GET /api/albums/:album_id/photos

Return all photos in an album, ordered by `COALESCE(capture_date, fallback_date) ASC`.

**Response 200**:
```json
[
  {
    "id": 12,
    "album_id": 1,
    "filename": "IMG_001.jpg",
    "capture_date": "2025-07-14T09:23:00",
    "fallback_date": "2026-04-29T08:00:00Z",
    "mime_type": "image/jpeg",
    "thumbnail_url": "/api/image?path=%2FUsers%2Falice%2FPhotos%2FIMG_001.jpg",
    "added_at": "2026-04-29T10:00:00Z"
  }
]
```

---

### POST /api/albums/:album_id/photos

Add one or more photos to an album.

**Request body**:
```json
{
  "photos": [
    {
      "file_path": "/Users/alice/Photos/IMG_001.jpg",
      "filename": "IMG_001.jpg",
      "capture_date": "2025-07-14T09:23:00",
      "fallback_date": "2026-04-29T08:00:00Z",
      "mime_type": "image/jpeg"
    }
  ]
}
```

**Validation**:
- `file_path` must exist on disk and resolve to a readable image file.
- `mime_type` must be one of: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/avif`.
- Duplicate `file_path` within the same album is rejected.
- Path traversal attempts (e.g., `../../../etc/passwd`) are rejected with 400.

**Response 201**:
```json
{ "added": 1, "skipped_duplicates": 0, "photos": [ { /* photo object */ } ] }
```

**Response 400**: `{ "error": "One or more files are not accessible or not valid images." }`  
**Response 404**: `{ "error": "Album not found." }`

---

### DELETE /api/albums/:album_id/photos/:photo_id

Remove a photo record from an album. The image file on disk is NOT deleted.

**Response 204**: No body.  
**Response 404**: `{ "error": "Photo not found in this album." }`

---

## Image Serving

### GET /api/image?path=\<encoded-absolute-path\>

Stream an image file from the local filesystem.

**Security rules (server-enforced)**:
1. Decode and resolve the path; reject if it contains `..` or null bytes.
2. Verify the resolved path exists and is a regular file.
3. Verify the file's MIME type is in the allowed set.
4. Optionally restrict to paths within user-configured root directories.

**Response 200**: Binary image stream with appropriate `Content-Type` header.  
**Response 400**: `{ "error": "Invalid or disallowed path." }`  
**Response 404**: `{ "error": "File not found." }`

---

## Error Shape

All error responses share a consistent shape:

```json
{ "error": "<human-readable message>" }
```

HTTP status codes follow standard semantics: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 404 Not Found, 500 Internal Server Error.
