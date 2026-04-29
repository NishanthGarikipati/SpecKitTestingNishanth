import { validateImagePath } from '../lib/pathValidator.js';

/**
 * Recompute date_label for an album after photo changes.
 */
function recomputeDateLabel(db, albumId) {
  db.prepare(`
    UPDATE albums
    SET date_label = COALESCE(
      (SELECT substr(COALESCE(p.capture_date, p.fallback_date), 1, 7)
       FROM photos p
       WHERE p.album_id = ?
       ORDER BY COALESCE(p.capture_date, p.fallback_date) DESC
       LIMIT 1),
      strftime('%Y-%m', 'now')
    ),
    updated_at = datetime('now')
    WHERE id = ?
  `).run(albumId, albumId);
}

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif',
]);

export default async function photoRoutes(fastify) {
  const { db } = fastify;

  // GET /api/albums/:album_id/photos
  fastify.get('/albums/:album_id/photos', async (req, reply) => {
    const albumId = Number(req.params.album_id);
    const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
    if (!album) return reply.status(404).send({ error: 'Album not found.' });

    const photos = db.prepare(`
      SELECT * FROM photos
      WHERE album_id = ?
      ORDER BY COALESCE(capture_date, fallback_date) ASC
    `).all(albumId);

    const response = photos.map((p) => ({
      ...p,
      thumbnail_url: `/api/image?path=${encodeURIComponent(p.file_path)}`,
    }));

    return reply.send(response);
  });

  // POST /api/albums/:album_id/photos
  fastify.post('/albums/:album_id/photos', async (req, reply) => {
    const albumId = Number(req.params.album_id);
    const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
    if (!album) return reply.status(404).send({ error: 'Album not found.' });

    const { photos } = req.body || {};
    if (!Array.isArray(photos) || photos.length === 0) {
      return reply.status(400).send({ error: 'photos must be a non-empty array.' });
    }

    const inserted = [];
    let skippedDuplicates = 0;

    const insertStmt = db.prepare(
      'INSERT OR IGNORE INTO photos (album_id, file_path, filename, capture_date, fallback_date, mime_type) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertAll = db.transaction((items) => {
      for (const photo of items) {
        const { file_path, filename, capture_date, fallback_date, mime_type } = photo;

        if (!ALLOWED_MIME.has(mime_type)) {
          throw Object.assign(new Error(`File type not allowed: ${mime_type}`), { statusCode: 400 });
        }

        // Validate the path is accessible
        validateImagePath(file_path);

        const result = insertStmt.run(albumId, file_path, filename, capture_date || null, fallback_date, mime_type);
        if (result.changes > 0) {
          inserted.push(db.prepare('SELECT * FROM photos WHERE id = ?').get(result.lastInsertRowid));
        } else {
          skippedDuplicates++;
        }
      }
    });

    try {
      insertAll(photos);
    } catch (err) {
      return reply.status(err.statusCode || 400).send({ error: err.message });
    }

    recomputeDateLabel(db, albumId);

    const response = inserted.map((p) => ({
      ...p,
      thumbnail_url: `/api/image?path=${encodeURIComponent(p.file_path)}`,
    }));

    return reply.status(201).send({ added: inserted.length, skipped_duplicates: skippedDuplicates, photos: response });
  });

  // DELETE /api/albums/:album_id/photos/:photo_id
  fastify.delete('/albums/:album_id/photos/:photo_id', async (req, reply) => {
    const albumId = Number(req.params.album_id);
    const photoId = Number(req.params.photo_id);

    const photo = db.prepare('SELECT id FROM photos WHERE id = ? AND album_id = ?').get(photoId, albumId);
    if (!photo) return reply.status(404).send({ error: 'Photo not found in this album.' });

    db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
    recomputeDateLabel(db, albumId);

    return reply.status(204).send();
  });
}
