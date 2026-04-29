# Quickstart: Photo Album Organizer

**Feature**: `001-photo-album-organizer`  
**Date**: 2026-04-29

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x LTS |
| npm | 9.x |
| Git | any modern version |

---

## Install and Run (Development)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd photo-album-organizer

# 2. Install dependencies
npm install

# 3. Start both the Vite dev server and the Node.js API server
npm run dev
```

This starts:
- **Vite dev server** at `http://localhost:5173` (frontend with HMR)
- **Node.js API server** at `http://localhost:3001` (Fastify + SQLite)

Vite proxies all `/api/*` and `/api/image*` requests to the Node server automatically.

Open `http://localhost:5173` in your browser to use the application.

---

## First Use

1. Open `http://localhost:5173`.
2. Click **New Album** and enter a name.
3. Open the album and click **Add Photos** to select image files from your local disk.
4. Return to the main page to see your album grouped by date.
5. Drag album tiles to reorder them — the order is saved automatically.

---

## Project Structure

```
photo-album-organizer/
├── index.html                  # App entry point (single-page)
├── src/
│   ├── main.js                 # JS entry — router + bootstrap
│   ├── pages/
│   │   ├── home.js             # Main page: album grid + drag-and-drop
│   │   └── album.js            # Album view: photo tile grid
│   ├── components/
│   │   ├── albumTile.js        # Album card component
│   │   └── photoTile.js        # Photo thumbnail tile component
│   ├── services/
│   │   ├── api.js              # fetch() wrappers for /api/* endpoints
│   │   └── exif.js             # exifr wrapper for capture date extraction
│   └── styles/
│       ├── main.css            # Global styles + CSS variables
│       ├── home.css            # Main page layout
│       └── album.css           # Album view tile grid
├── server/
│   ├── index.js                # Fastify server entry point
│   ├── db.js                   # better-sqlite3 setup + schema migration
│   ├── routes/
│   │   ├── albums.js           # Album CRUD + reorder routes
│   │   ├── photos.js           # Photo add/delete routes
│   │   └── image.js            # Image streaming route (security-validated)
│   └── lib/
│       └── pathValidator.js    # Path traversal / MIME validation utilities
├── data/                       # SQLite DB file created here at first run
│   └── photo-organizer.db      # (git-ignored)
├── vite.config.js              # Vite config with /api proxy
└── package.json
```

---

## Production Build

```bash
npm run build       # vite build → dist/
npm run start       # node server/index.js (serves dist/ + /api)
```

The built app is served entirely by the Node.js server on a single port (default: 3001). No separate static server needed.

---

## Configuration

Environment variables (`.env` at project root):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port for the Node.js server |
| `DB_PATH` | `./data/photo-organizer.db` | Path to the SQLite database file |

---

## Running Tests

```bash
npm test            # Run all unit and integration tests
npm run test:unit   # Unit tests only
npm run test:api    # API integration tests (starts test DB)
```

Test coverage is reported automatically. Coverage MUST remain at or above 80% (constitution gate).

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| Images not displaying | Absolute path stored in DB is no longer valid (file moved/deleted) | Re-add the photo; broken images show a placeholder |
| HEIC photos not rendering | Browser does not support HEIC natively | Expected in v1; HEIC metadata (dates) is read correctly; display support deferred to v2 |
| Port conflict on 3001 | Another process using the port | Set `PORT=3002` in `.env` |
| SQLite locked error | Two server instances running | Stop the extra process; only one server instance should run |
