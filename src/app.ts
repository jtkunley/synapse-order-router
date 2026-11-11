import express from 'express';
import { getEnv } from './config/env';
import { handleError } from './middleware/error-handler';
import { addRoutes } from './routes';
import { loadCatalog } from './services/catalog/index';

export async function createApp(): Promise<express.Express> {
  // Throws on a missing or malformed catalog so the server never starts without data (BRX-011).
  await loadCatalog(getEnv().dataDir);

  const app = express();
  app.disable('x-powered-by');

  addRoutes(app);
  app.use(handleError);
  return app;
}
