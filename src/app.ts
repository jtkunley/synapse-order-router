import express from 'express';
import { getEnv } from './config/env.js';
import { handleError } from './middleware/error-handler.js';
import { addRoutes } from './routes.js';
import { loadCatalog } from './services/catalog/index.js';

export async function createApp(): Promise<express.Express> {
  // Throws on a missing or malformed catalog so the server never starts without data (OPEN-007).
  await loadCatalog(getEnv().dataDir);

  const app = express();
  app.disable('x-powered-by');

  addRoutes(app);
  app.use(handleError);
  return app;
}
