import { createReadStream } from 'fs';
import { validateImagePath } from '../lib/pathValidator.js';

export default async function imageRoutes(fastify) {
  // GET /api/image?path=<encoded-absolute-path>
  fastify.get('/image', async (req, reply) => {
    const rawPath = req.query.path;

    if (!rawPath) {
      return reply.status(400).send({ error: 'path query parameter is required.' });
    }

    let absolutePath, mimeType;
    try {
      ({ absolutePath, mimeType } = validateImagePath(rawPath));
    } catch (err) {
      const msg = err.message || 'Invalid path.';
      const status = msg.includes('not found') || msg.includes('not accessible') ? 404 : 400;
      return reply.status(status).send({ error: msg });
    }

    const stream = createReadStream(absolutePath);
    return reply.header('Content-Type', mimeType).send(stream);
  });
}
