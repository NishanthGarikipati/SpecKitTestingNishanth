import Fastify from 'fastify';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { initDb } from './db.js';
import albumRoutes from './routes/albums.js';
import photoRoutes from './routes/photos.js';
import imageRoutes from './routes/image.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const PORT = parseInt(process.env.PORT || '3001', 10);
const DB_PATH = resolve(process.env.DB_PATH || join(__dirname, '../data/photo-organizer.db'));

export async function buildApp(dbOverride) {
  const fastify = Fastify({ logger: false });

  // Initialise database
  const db = dbOverride || initDb(DB_PATH);

  // Make db available to routes via decorator
  fastify.decorate('db', db);

  // Register routes
  await fastify.register(albumRoutes, { prefix: '/api' });
  await fastify.register(photoRoutes, { prefix: '/api' });
  await fastify.register(imageRoutes, { prefix: '/api' });

  // Serve built frontend in production
  if (isProd) {
    const { default: fastifyStatic } = await import('@fastify/static');
    await fastify.register(fastifyStatic, {
      root: resolve(join(__dirname, '../dist')),
      prefix: '/',
    });
  }

  // Global error handler — never expose stack traces
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({ error: error.message || 'An unexpected error occurred.' });
  });

  return fastify;
}

// Only start the server when this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await buildApp();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  // eslint-disable-next-line no-console
  console.log(`API server running at http://127.0.0.1:${PORT}`);
}
