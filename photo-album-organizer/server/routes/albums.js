/**
 * Helper: recompute date_label for an album based on its most recent photo date.
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

/**
 * Helper: build a full album response object including photo_count and cover_url.
 */
function buildAlbumResponse(db, id) {
  const row = db.prepare(`
    SELECT
      a.*,
      COUNT(p.id) AS photo_count,
      COALESCE(
        (SELECT p2.file_path FROM photos p2 WHERE p2.id = a.cover_photo_id LIMIT 1),
        (SELECT p3.file_path FROM photos p3 WHERE p3.album_id = a.id ORDER BY p3.added_at ASC LIMIT 1)
      ) AS cover_file_path
    FROM albums a
    LEFT JOIN photos p ON p.album_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(id);
  if (!row) return null;
  return albumRowToResponse(row);
}

function albumRowToResponse(row) {
  return {
    id: row.id,
    name: row.name,
    date_label: row.date_label,
    sort_order: row.sort_order,
    photo_count: row.photo_count ?? 0,
    cover_url: row.cover_file_path
      ? `/api/image?path=${encodeURIComponent(row.cover_file_path)}`
      : null,
    created_at: row.created_at,
  };
}

export default async function albumRoutes(fastify) {
  const { db } = fastify;

  // GET /api/albums
  fastify.get('/albums', async (_req, reply) => {
    const rows = db.prepare(`
      SELECT
        a.*,
        COUNT(p.id) AS photo_count,
        COALESCE(
          (SELECT p2.file_path FROM photos p2 WHERE p2.id = a.cover_photo_id LIMIT 1),
          (SELECT p3.file_path FROM photos p3 WHERE p3.album_id = a.id ORDER BY p3.added_at ASC LIMIT 1)
        ) AS cover_file_path
      FROM albums a
      LEFT JOIN photos p ON p.album_id = a.id
      GROUP BY a.id
      ORDER BY a.sort_order ASC
    `).all();

    return reply.send(rows.map(albumRowToResponse));
  });

  // POST /api/albums
  fastify.post('/albums', async (req, reply) => {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply.status(400).send({ error: 'Album name is required and must not be empty.' });
    }
    if (name.trim().length > 255) {
      return reply.status(400).send({ error: 'Album name must not exceed 255 characters.' });
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM albums').get();
    const sortOrder = (maxOrder.m ?? -1) + 1;

    const result = db.prepare(
      'INSERT INTO albums (name, sort_order) VALUES (?, ?)'
    ).run(name.trim(), sortOrder);

    const album = buildAlbumResponse(db, result.lastInsertRowid);
    return reply.status(201).send(album);
  });

  // PATCH /api/albums/order  — must be registered before /albums/:id
  fastify.patch('/albums/order', async (req, reply) => {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
      return reply.status(400).send({ error: 'order must be a non-empty array of album IDs.' });
    }

    // Verify all IDs exist
    const existing = db.prepare(
      `SELECT id FROM albums WHERE id IN (${order.map(() => '?').join(',')})`
    ).all(...order);

    if (existing.length !== order.length) {
      return reply.status(400).send({ error: 'Invalid album ID(s) in order array.' });
    }

    const update = db.prepare('UPDATE albums SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const updateAll = db.transaction((ids) => {
      ids.forEach((id, index) => update.run(index, id));
    });
    updateAll(order);

    return reply.send({ updated: order.length });
  });

  // PATCH /api/albums/:id
  fastify.patch('/albums/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM albums WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Album not found.' });

    const { name, cover_photo_id } = req.body || {};
    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return reply.status(400).send({ error: 'Album name must not be empty.' });
      }
      if (name.trim().length > 255) {
        return reply.status(400).send({ error: 'Album name must not exceed 255 characters.' });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (cover_photo_id !== undefined) {
      updates.push('cover_photo_id = ?');
      values.push(cover_photo_id);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update.' });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE albums SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return reply.send(buildAlbumResponse(db, id));
  });

  // DELETE /api/albums/:id
  fastify.delete('/albums/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM albums WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Album not found.' });

    db.prepare('DELETE FROM albums WHERE id = ?').run(id);
    return reply.status(204).send();
  });
}
