# Research: Photo Album Organizer

**Feature**: `001-photo-album-organizer`  
**Date**: 2026-04-29  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. SQLite Access Strategy

**Decision**: Lightweight Node.js HTTP server (`Fastify`) + `better-sqlite3`

The app runs two processes in development (Vite dev server on port 5173, Node.js API server on port 3001); Vite proxies `/api/*` to the Node server. In production, `vite build` outputs static assets and the Node server serves both the built frontend and the API from a single process.

**Rationale**: `better-sqlite3` provides a synchronous, zero-configuration SQLite interface writing to a real file on disk. No WASM bundle, no browser permission re-grants, no session state issues.

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| sql.js (WASM in browser) | ~1.5 MB WASM bundle; OPFS persistence is complex; no real filesystem path access. |
| node:sqlite (Node 22 built-in) | Still experimental; mandates Node 22+ which may not be available universally. |
| Electron + Vite | Adds ~150 MB Chromium runtime; overkill for a local tool. |
| Tauri + Vite | Requires Rust toolchain; higher setup complexity. |

---

## 2. Local Image File Access

**Decision**: Node.js server streams images from disk via `GET /api/image?path=<encoded-absolute-path>`

SQLite stores the absolute file path (e.g., `C:\Photos\IMG_001.jpg`). The Node server reads the file and streams it with the correct `Content-Type`. The browser uses a standard `<img src="/api/image?path=...">` tag.

**Rationale**: Works on page reload with zero user interaction; no session state; handles thumbnails and full-size display uniformly.

**Security note**: The server MUST validate that the resolved path exists, has an image MIME type, and is within user-selected root directories. Arbitrary path traversal MUST be rejected.

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| File System Access API + createObjectURL | Blob URLs are session-only; FileSystemFileHandle re-grant is required on every new session — unworkable for a persistent gallery. |
| Copy thumbnails to app data dir | Doubles disk usage; out of scope for v1. |

---

## 3. Drag-and-Drop Reordering

**Decision**: Native HTML5 Drag-and-Drop API + `sort_order INTEGER` column in SQLite

**Pattern**:
- Album tiles have `draggable="true"`.
- `dragstart` records the dragged album ID in `dataTransfer`.
- `dragover` uses `getBoundingClientRect()` midpoint logic to insert the ghost element into the correct DOM position.
- `drop` collects the new DOM order and calls `PATCH /api/albums/order` with the sorted ID array.
- The server runs a single transaction updating each album's `sort_order`.
- On page load, albums are fetched `ORDER BY sort_order ASC`.

**Touch caveat**: HTML5 DnD does not fire on touch devices. Acceptable for v1 (desktop local tool). A `pointermove`-based fallback can be added in a future iteration.

**Alternatives considered**: dnd-kit, SortableJS — both functional but contradict the "minimal libraries" constraint.

---

## 4. EXIF / Capture Date Extraction

**Decision**: `exifr` library (browser-side, ~25 KB gzipped)

Called when the user selects files via `<input type="file">`. Extracts `DateTimeOriginal` from JPEG, HEIC, WebP, PNG, AVIF. Falls back to `null` → UI uses file's `lastModified` timestamp. The extracted date is sent to the server and stored in SQLite alongside the file path.

**HEIC display caveat**: Chrome and Firefox cannot render HEIC natively. `exifr` reads HEIC metadata fine. Full HEIC display support (via server-side `sharp` transcoding) is deferred to v2.

**Alternatives considered**:

| Option | Why rejected |
|--------|-------------|
| exif-js | JPEG only, unmaintained. |
| Manual EXIF parsing | HEIC uses ISOBMFF container — too complex for in-scope effort. |
| sharp (Node.js) | ~40 MB native dep; useful for thumbnail generation later but overkill for date extraction alone. |

---

## Architecture Summary

```
[ Browser: Vite + Vanilla HTML/CSS/JS ]
    │  File picker → exifr extracts capture date client-side
    │  /api/*      → proxied to Node.js server
    │  /api/image  → Node.js streams file from disk
    ↓
[ Node.js: Fastify + better-sqlite3 ]
    │  Reads/writes SQLite DB (local file on disk)
    │  Streams image files from stored absolute paths
    └─ DB: ./data/photo-organizer.db  (configurable)
```

**Final dependency list** (minimal):

| Package | Role |
|---------|------|
| `vite` | Frontend build & dev server |
| `fastify` | Lightweight Node.js HTTP server for API |
| `better-sqlite3` | SQLite driver (synchronous, file-based) |
| `exifr` | Client-side EXIF metadata extraction |
| `concurrently` | Dev-only: run Vite + Node server simultaneously |
