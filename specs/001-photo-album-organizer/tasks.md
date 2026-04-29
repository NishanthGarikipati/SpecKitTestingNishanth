---
description: "Task list for Photo Album Organizer implementation"
---

# Tasks: Photo Album Organizer

**Input**: Design documents from `specs/001-photo-album-organizer/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅
**Branch**: `001-photo-album-organizer`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies with in-progress tasks)
- **[US1–US4]**: Which user story this task belongs to
- All paths are relative to `photo-album-organizer/` (project root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the project scaffolding, tooling, and config files so all subsequent work has a clean base.

- [X] T001 Create `photo-album-organizer/` project root with directory tree: `src/pages/`, `src/components/`, `src/services/`, `src/styles/`, `server/routes/`, `server/lib/`, `tests/unit/`, `tests/integration/`, `data/`
- [X] T002 Create `photo-album-organizer/package.json` with scripts (`dev`, `build`, `start`, `test`, `lint`) and all dependencies: `vite`, `fastify`, `better-sqlite3`, `exifr`; devDependencies: `concurrently`, `vitest`, `@vitest/coverage-v8`, `eslint`, `prettier`
- [X] T003 [P] Create `photo-album-organizer/index.html` as the single-page app shell with a `<div id="app">` mount point, `<script type="module" src="/src/main.js">`, and base `<meta>` tags
- [X] T004 [P] Create `photo-album-organizer/vite.config.js` with `/api` server proxy pointing to `http://localhost:3001` so all `/api/*` and `/api/image*` requests are forwarded to the Node server
- [X] T005 [P] Create `photo-album-organizer/.eslintrc.js` enforcing: `complexity` rule threshold 10, `no-unused-vars`, `no-console` (warn), ES2022 globals; apply to `src/` and `server/`
- [X] T006 [P] Create `photo-album-organizer/.prettierrc` with consistent formatting defaults (single quotes, 2-space indent, trailing comma `es5`)
- [X] T007 [P] Create `photo-album-organizer/vitest.config.js` enabling coverage via `@vitest/coverage-v8` with global threshold of 80% for lines, functions, branches, and statements
- [X] T008 [P] Create `photo-album-organizer/.gitignore` excluding `node_modules/`, `dist/`, `data/*.db`, `.env`; create `photo-album-organizer/.env.example` with `PORT=3001` and `DB_PATH=./data/photo-organizer.db`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core server, database, CSS design system, router, and API client that every user story builds on. **No user story work begins until this phase is complete.**

- [X] T009 Implement `photo-album-organizer/server/db.js`: initialise `better-sqlite3` from `DB_PATH` env var, run `PRAGMA foreign_keys = ON`, execute the full schema DDL from `data-model.md` (`CREATE TABLE IF NOT EXISTS albums`, `CREATE TABLE IF NOT EXISTS photos`, all four indexes) in a single `db.exec()` call on startup
- [X] T010 [P] Implement `photo-album-organizer/server/lib/pathValidator.js`: export `validateImagePath(rawPath)` that (1) decodes URI, (2) rejects paths containing `..` or null bytes, (3) resolves to absolute path, (4) verifies the file exists via `fs.statSync`, (5) checks extension/MIME against allow-list (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/avif`); throw descriptive errors for each failure mode
- [X] T011 Implement `photo-album-organizer/server/index.js`: create Fastify instance, load env (`PORT`, `DB_PATH`), call `db.js` init, register route files from `server/routes/` (albums, photos, image), add a global error handler that returns `{ error: message }` JSON (no stack traces), listen on `PORT`
- [X] T012 [P] Implement `photo-album-organizer/src/styles/main.css`: define CSS custom properties (color tokens, spacing scale, border-radius, font family/sizes), CSS reset (`box-sizing`, margin/padding zero), and base typography; import this file from `src/main.js`
- [X] T013 Implement `photo-album-organizer/src/main.js`: simple hash-based router (`hashchange` + `load` events) that maps `#/` → `home.js` and `#/album/:id` → `album.js`; render the matched page into `<div id="app">`; expose a `navigate(hash)` helper used by all pages
- [X] T014 [P] Implement `photo-album-organizer/src/services/api.js`: export typed `fetch()` wrappers for every endpoint in `contracts/api.md` — `getAlbums()`, `createAlbum(name)`, `updateAlbum(id, data)`, `deleteAlbum(id)`, `reorderAlbums(orderedIds)`, `getPhotos(albumId)`, `addPhotos(albumId, photos[])`, `deletePhoto(albumId, photoId)`, `imageUrl(path)` — each wrapping `fetch`, checking `response.ok`, and throwing `Error(json.error)` on failure

**Checkpoint**: DB schema, server, CSS system, router, and API client are ready — user stories can now begin.

---

## Phase 3: User Story 1 — Create Album and Add Photos (Priority: P1) 🎯 MVP

**Goal**: Users can create a named album and add local image files to it. The album appears on the main page after creation.

**Independent Test**: Run the app, create a new album, add image files, confirm the album tile appears with the correct name and photo count. No other story is required for this test to pass.

- [X] T015 [P] [US1] Implement `photo-album-organizer/server/lib/pathValidator.js` unit tests in `tests/unit/pathValidator.test.js`: cover path traversal attempts (`../etc/passwd`), null-byte injection, disallowed extensions, non-existent files, and valid paths; use Vitest
- [X] T016 [US1] Implement `POST /api/albums` and `DELETE /api/albums/:id` in `photo-album-organizer/server/routes/albums.js`: insert with auto-assigned `sort_order = MAX(sort_order)+1`, return 201 with full album object; delete cascades via SQLite FK, return 204; validate name non-empty, max 255 chars
- [X] T017 [P] [US1] Implement `photo-album-organizer/src/services/exif.js`: export `async getCaptureDate(file)` using `exifr.parse(file, { DateTimeOriginal: true })`, returning an ISO string or `null`; export `getEffectiveDate(file)` that falls back to `file.lastModified` when EXIF is null
- [X] T018 [P] [US1] Implement `photo-album-organizer/tests/unit/exif.test.js`: unit tests for `getCaptureDate` with a JPEG fixture that has EXIF data, a file with no EXIF, and the fallback path; mock `exifr.parse` to avoid bundler complexity in tests
- [X] T019 [US1] Implement `POST /api/albums/:album_id/photos` in `photo-album-organizer/server/routes/photos.js`: accept `{ photos: [{file_path, filename, capture_date, fallback_date, mime_type}] }`, call `validateImagePath` for each, insert rows, recompute `date_label` on the album via the SQL from `data-model.md`, return 201 with `{ added, skipped_duplicates, photos }`
- [X] T020 [P] [US1] Implement `photo-album-organizer/tests/integration/albums.test.js`: contract tests for `POST /api/albums` (valid, empty name, too long name) and `DELETE /api/albums/:id` (found, not found); spin up a test Fastify instance with an in-memory SQLite DB
- [X] T021 [P] [US1] Implement `photo-album-organizer/tests/integration/photos.test.js`: contract tests for `POST /api/albums/:id/photos` covering valid add, non-image MIME rejection, duplicate path rejection, and missing album 404; use temp files on disk for valid paths
- [X] T022 [US1] Implement album-creation UI in `photo-album-organizer/src/pages/home.js`: render a "New Album" button that opens a modal with a name `<input>` and submit/cancel; on submit call `api.createAlbum(name)`, display a human-readable error on failure, close modal and re-render tile on success
- [X] T023 [US1] Implement add-photos UI in `photo-album-organizer/src/pages/album.js`: render the album header and an "Add Photos" button that triggers `<input type="file" accept="image/*" multiple>`; on file selection call `exif.getEffectiveDate` per file, collect metadata, call `api.addPhotos`, display error toast for rejected files, re-render photo grid on success

---

## Phase 4: User Story 2 — Browse Albums on the Main Page (Priority: P2)

**Goal**: The main page displays all albums as tiles grouped by date period (YYYY-MM), most recent first. Each tile shows album name, cover thumbnail, and photo count. Empty-state shown when no albums exist.

**Independent Test**: Pre-populate the DB with albums from different months. Open the app. Confirm tiles are visually grouped by date header, each tile shows correct name/count/cover.

- [X] T024 [P] [US2] Implement `GET /api/albums` in `photo-album-organizer/server/routes/albums.js`: query `albums` joined with a subquery for `photo_count` and `cover_url` (first photo by `added_at ASC` when `cover_photo_id IS NULL`), order by `sort_order ASC`; build `cover_url` using `/api/image?path=<encoded>`
- [X] T025 [P] [US2] Implement `photo-album-organizer/tests/integration/albums.test.js` — add `GET /api/albums` tests: empty list returns `[]`, populated list returns sorted items with correct `photo_count` and `cover_url`
- [X] T026 [US2] Implement `photo-album-organizer/src/components/albumTile.js`: export `createAlbumTile(album)` returning a DOM element showing cover `<img>` (falling back to a CSS placeholder when `cover_url` is null), album name, and photo count badge; wire a `click` handler that calls `navigate('#/album/' + album.id)`
- [X] T027 [P] [US2] Implement `photo-album-organizer/tests/unit/albumTile.test.js`: test tile renders name, photo count, placeholder when no cover; test click fires `navigate` with correct hash
- [X] T028 [US2] Implement main-page album grid in `photo-album-organizer/src/pages/home.js`: call `api.getAlbums()`, group albums by `date_label` (descending), render a `<section>` per group with a formatted date heading (`"April 2026"` from `YYYY-MM`) and album tiles via `createAlbumTile`; render the empty-state `<p>` with "No albums yet — create your first!" when list is empty
- [X] T029 [P] [US2] Implement `photo-album-organizer/src/styles/home.css`: CSS grid for album tiles (auto-fill, min 200 px columns), date-group heading styles, cover image aspect-ratio box, photo count badge, empty-state centred message

---

## Phase 5: User Story 3 — View Photos Inside an Album (Priority: P3)

**Goal**: Opening an album shows all photos in a uniform thumbnail tile grid. Clicking a tile opens a full-screen lightbox preview. Navigating back restores the main page scroll position.

**Independent Test**: Open any album with photos. Confirm tile grid renders all photos. Click a photo — lightbox opens with the full image. Press Escape or back — lightbox closes; back arrow returns to main page.

- [X] T030 [P] [US3] Implement `GET /api/albums/:album_id/photos` in `photo-album-organizer/server/routes/photos.js`: return all photos for the album ordered by `COALESCE(capture_date, fallback_date) ASC`; return 404 if album not found; include `thumbnail_url` = `/api/image?path=<encoded>`
- [X] T031 [P] [US3] Implement `GET /api/image` in `photo-album-organizer/server/routes/image.js`: decode `path` query param, call `validateImagePath`, then stream the file with `fs.createReadStream` via Fastify `reply.send(stream)` and correct `Content-Type`; return 400/404 on validation failure
- [X] T032 [P] [US3] Implement `photo-album-organizer/tests/integration/image.test.js`: security tests — path traversal (`../../../etc/passwd`), null byte, disallowed MIME, non-existent file all return 4xx; valid path returns 200 with correct `Content-Type`
- [X] T033 [P] [US3] Implement `photo-album-organizer/tests/integration/photos.test.js` — add `GET /api/albums/:id/photos` tests: correct ordering, 404 for missing album, `thumbnail_url` format
- [X] T034 [US3] Implement `photo-album-organizer/src/components/photoTile.js`: export `createPhotoTile(photo)` returning a `<figure>` with `<img src="${photo.thumbnail_url}">` (lazy loading via `loading="lazy"`), filename caption, and a `click` handler that dispatches a custom `open-lightbox` event with the photo object
- [X] T035 [US3] Implement `photo-album-organizer/src/pages/album.js` photo grid: call `api.getPhotos(albumId)`, render all photos with `createPhotoTile` in a CSS grid; add back-navigation arrow that calls `navigate('#/')` and restores `window.scrollY` saved before leaving the main page
- [X] T036 [P] [US3] Implement `photo-album-organizer/src/styles/album.css`: CSS grid for photo tiles (auto-fill, min 150 px columns, square aspect-ratio), hover overlay, album header with back button
- [X] T037 [US3] Implement lightbox in `photo-album-organizer/src/pages/album.js`: listen for `open-lightbox` on the album container; render a `<dialog>` overlay with full-size `<img src="/api/image?path=...">`, close on Escape key and backdrop click; trap focus inside the dialog while open

---

## Phase 6: User Story 4 — Reorder Albums via Drag-and-Drop (Priority: P4)

**Goal**: Users drag album tiles to a new position on the main page. The order persists across reloads.

**Independent Test**: Open the main page with several albums. Drag one tile to a new position. Reload the page. Confirm the custom order is preserved.

- [X] T038 [P] [US4] Implement `PATCH /api/albums/order` in `photo-album-organizer/server/routes/albums.js`: accept `{ order: [id, ...] }`, validate all IDs exist, run a transaction reassigning `sort_order = index` for each; return `{ updated: n }`; return 400 for invalid IDs
- [X] T039 [P] [US4] Implement `photo-album-organizer/tests/integration/albums.test.js` — add `PATCH /api/albums/order` tests: valid reorder persists and is returned in new order by `GET /api/albums`; unknown ID returns 400
- [X] T040 [US4] Add drag-and-drop to album tiles in `photo-album-organizer/src/pages/home.js`: set `draggable="true"` on each tile; implement `dragstart` (store album ID in `dataTransfer`), `dragover` (prevent default, insert ghost at correct position using midpoint logic on `getBoundingClientRect`), `dragleave` (remove visual indicator), and `drop` (call `api.reorderAlbums(orderedIds)` with DOM order, show error toast on failure)
- [X] T041 [P] [US4] Add drag-over visual indicator styles to `photo-album-organizer/src/styles/home.css`: `.drag-over` class with a visible insertion-line indicator; `.dragging` class with reduced opacity on the dragged tile

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Album management actions (rename, delete), error feedback, responsive layout, and production build.

- [X] T042 [P] Implement `PATCH /api/albums/:id` in `photo-album-organizer/server/routes/albums.js`: accept optional `name` and `cover_photo_id`, validate same rules as POST, update `updated_at`, return updated album; 404 if not found
- [X] T043 Implement album rename and delete confirmation in `photo-album-organizer/src/pages/home.js`: add a kebab-menu or context button on each `albumTile` with "Rename" (inline editable name field calling `api.updateAlbum`) and "Delete" (native `confirm()` dialog calling `api.deleteAlbum`, then re-render)
- [X] T044 [P] Implement error toast notification in `photo-album-organizer/src/main.js`: export `showToast(message, type)` that appends a self-dismissing `<div role="alert">` to `<body>`; used by all pages for non-blocking error display
- [X] T045 [P] Implement responsive CSS breakpoints in `photo-album-organizer/src/styles/home.css` and `src/styles/album.css`: adjust grid column counts for narrow (< 480 px), medium (480–1024 px), and wide (> 1024 px) viewports using `@media` queries
- [X] T046 [P] Implement `DELETE /api/albums/:album_id/photos/:photo_id` in `photo-album-organizer/server/routes/photos.js`: delete the photo row, recompute `date_label` on the parent album, return 204; 404 if not found
- [X] T047 Implement production build config in `photo-album-organizer/server/index.js`: when `NODE_ENV=production`, serve `dist/` as static files from Fastify using `@fastify/static`; add `@fastify/static` to `package.json` dependencies; document `npm run build && npm run start` in-place

---

## Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational — T009–T014)
        └─► Phase 3 (US1: T015–T023)  ← MVP
              └─► Phase 4 (US2: T024–T029)
                    └─► Phase 5 (US3: T030–T037)
                          └─► Phase 6 (US4: T038–T041)
                                └─► Phase 7 (Polish: T042–T047)
```

**Story independence**: Each story phase depends on Phase 2 (Foundational) being complete. Stories 2–4 also benefit from Story 1's server routes (albums.js) being started, but their frontend and test tasks are fully independent.

**Cross-story file shared edits**:

| File | Stories that extend it |
|------|----------------------|
| `server/routes/albums.js` | US1 (T016), US2 (T024), US4 (T038), Polish (T042) |
| `server/routes/photos.js` | US1 (T019), US3 (T030), Polish (T046) |
| `src/pages/home.js` | US1 (T022), US2 (T028), US4 (T040), Polish (T043) |
| `src/pages/album.js` | US1 (T023), US3 (T035, T037) |

---

## Parallel Execution Examples

### Phase 1 (after T001–T002 create the directories and package.json)
```
T003 vite.config.js     T004 .eslintrc.js      T005 .prettierrc
T006 vitest.config.js   T007 .gitignore/.env    T008 index.html
```

### Phase 2 (all can start once Phase 1 is done)
```
T009 db.js              T010 pathValidator.js   T012 main.css
T014 api.js             [T013 main.js after T012; T011 after T009+T010]
```

### Phase 3 — US1 (after Phase 2 complete)
```
T015 pathValidator tests   T017 exif.js         T018 exif tests
T016 POST /albums          T019 POST /photos     [T020 after T016]
T021 photos integration    [T022 after T016; T023 after T017+T019]
```

### Phase 4 — US2 (after Phase 2; can overlap with US1 frontend tasks)
```
T024 GET /albums     T025 GET /albums tests     T026 albumTile.js
T027 albumTile tests T029 home.css
[T028 home.js after T024+T026]
```

### Phase 5 — US3 (after Phase 2; server tasks parallel to US2)
```
T030 GET /photos    T031 image route    T032 image tests
T033 photos tests   T034 photoTile.js   T036 album.css
[T035 album.js after T030+T034; T037 lightbox after T035]
```

### Phase 6 — US4 (after Phase 2; T038 independent of US3 frontend)
```
T038 PATCH /order    T039 order tests    T041 DnD CSS
[T040 DnD home.js after T038+T039]
```

---

## Implementation Strategy

### MVP (Phase 1 + Phase 2 + Phase 3 only)
Implement Phases 1–3 first. This delivers full value for User Story 1: the user can create albums, add local photos, and see them appear with correct date grouping. Phases 4–7 are additive enhancements.

### Incremental Delivery Order
1. **Phases 1–3** → Working MVP: create albums, add photos, basic page render
2. **Phase 4** → Polished main page: grouped tiles with cover thumbnails, empty state
3. **Phase 5** → Core browsing: full photo tile grid + lightbox preview
4. **Phase 6** → Personalization: drag-and-drop order persistence
5. **Phase 7** → Production-ready: rename/delete, responsive layout, production build

### Task Count Summary
| Phase | Tasks | User Story |
|-------|-------|-----------|
| Phase 1 — Setup | T001–T008 | 8 tasks |
| Phase 2 — Foundational | T009–T014 | 6 tasks |
| Phase 3 — US1 Create & Add | T015–T023 | 9 tasks |
| Phase 4 — US2 Browse Main Page | T024–T029 | 6 tasks |
| Phase 5 — US3 View Album | T030–T037 | 8 tasks |
| Phase 6 — US4 Drag-and-Drop | T038–T041 | 4 tasks |
| Phase 7 — Polish | T042–T047 | 6 tasks |
| **Total** | | **47 tasks** |
