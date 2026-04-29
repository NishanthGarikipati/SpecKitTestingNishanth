# Implementation Plan: Photo Album Organizer

**Branch**: `001-photo-album-organizer` | **Date**: 2026-04-29 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/001-photo-album-organizer/spec.md`

## Summary

Build a locally-run web application that lets a single user organize photos into named albums, browse albums grouped by date on a drag-and-droppable main page, and preview photos inside albums in a tile grid. Photos are never uploaded; only their absolute paths and EXIF-derived metadata are stored in a local SQLite database. The stack is Vite + vanilla HTML/CSS/JS (frontend) with a Fastify + better-sqlite3 Node.js API server (backend).

## Technical Context

**Language/Version**: JavaScript (Node.js 18 LTS + browser ES2022)  
**Primary Dependencies**: `vite` (frontend build), `fastify` (API server), `better-sqlite3` (SQLite), `exifr` (EXIF extraction), `concurrently` (dev only)  
**Storage**: SQLite — `./data/photo-organizer.db` (local file, git-ignored)  
**Testing**: Vitest (unit + component), Node.js built-in `node:test` or Vitest for API integration tests  
**Target Platform**: Modern desktop browser (Chrome 110+, Firefox 115+, Edge 110+) via local dev/prod server  
**Project Type**: Local single-user web application (Vite SPA + Node.js backend)  
**Performance Goals**: Album tile grid renders ≤ 100 albums without scroll lag; photo tile grid renders ≤ 200 photos within 3 s; drag-and-drop feedback within 100 ms  
**Constraints**: API p95 ≤ 200 ms (constitution gate); no external network calls; offline-capable by design  
**Scale/Scope**: Single user; up to ~1000 photos across ~50 albums for v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | ESLint + Prettier enforced via `npm run lint`; cyclomatic complexity monitored by ESLint `complexity` rule (threshold 10) |
| **II. Testing Standards** | ✅ PASS | Vitest unit tests required before implementation; ≥ 80% coverage gate in CI; integration tests cover all API routes (contracts) |
| **III. UX Consistency** | ✅ PASS | CSS custom properties design system; consistent tile components for albums and photos; error messages human-readable (no stack traces) |
| **IV. Performance Requirements** | ✅ PASS | API route handlers targeted at < 200 ms p95; image streaming via Node.js stream pipeline; no N+1 queries (photos fetched per album in single query); Lighthouse CI for Core Web Vitals on photo grid |

No violations — Complexity Tracking section not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-photo-album-organizer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # HTTP API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
photo-album-organizer/
├── index.html                   # Single-page app shell
├── src/
│   ├── main.js                  # Entry: hash-router + page bootstrap
│   ├── pages/
│   │   ├── home.js              # Main page — album grid, date groups, DnD
│   │   └── album.js             # Album view — photo tile grid, add photos
│   ├── components/
│   │   ├── albumTile.js         # Album card (name, cover, count)
│   │   └── photoTile.js         # Photo thumbnail tile
│   ├── services/
│   │   ├── api.js               # fetch() wrappers for /api/* endpoints
│   │   └── exif.js              # exifr wrapper — capture date extraction
│   └── styles/
│       ├── main.css             # CSS variables, reset, typography
│       ├── home.css             # Main page tile grid + date-group headers
│       └── album.css            # Album view photo tile grid
├── server/
│   ├── index.js                 # Fastify server — register routes, start
│   ├── db.js                    # better-sqlite3 init + schema migration
│   ├── routes/
│   │   ├── albums.js            # GET/POST/PATCH/DELETE /api/albums, PATCH /api/albums/order
│   │   ├── photos.js            # GET/POST/DELETE /api/albums/:id/photos
│   │   └── image.js             # GET /api/image?path=... (security-validated stream)
│   └── lib/
│       └── pathValidator.js     # Path traversal + MIME allow-list validation
├── tests/
│   ├── unit/
│   │   ├── pathValidator.test.js
│   │   ├── exif.test.js
│   │   └── albumTile.test.js
│   └── integration/
│       ├── albums.test.js       # API contract tests for /api/albums
│       ├── photos.test.js       # API contract tests for /api/albums/:id/photos
│       └── image.test.js        # Security tests for /api/image
├── data/                        # Created at runtime, git-ignored
├── vite.config.js               # Vite + /api proxy config
├── .eslintrc.js                 # ESLint (complexity ≤ 10, no-unused-vars, etc.)
├── .prettierrc                  # Prettier config
├── vitest.config.js             # Vitest + coverage config (threshold: 80%)
└── package.json
```

**Structure Decision**: Single project (Option 1 variant adapted for Vite SPA + collocated Node.js server). The `src/` tree is the Vite frontend; `server/` is the Node.js API. Tests live in `tests/` at the root to cover both layers. This keeps the repository self-contained with a single `package.json`.

## Complexity Tracking

> No constitution violations — this section is not required.
