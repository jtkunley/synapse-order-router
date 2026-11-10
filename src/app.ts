import express from 'express';
import { getEnv } from './config/env.js';
import { addDocs } from './controllers/docs.js';
import { addOpenApi } from './controllers/openapi.js';
import { addRoute } from './controllers/route.js';
import { handleError } from './middleware/error-handler.js';
import { loadCatalog } from './services/catalog/index.js';

export async function createApp(): Promise<express.Express> {
  // Throws on a missing or malformed catalog so the server never starts without data (OPEN-007).
  await loadCatalog(getEnv().dataDir);

  const app = express();
  app.disable('x-powered-by');

  addOpenApi(app);
  addDocs(app);
  addRoute(app);
  app.use(handleError);
  return app;
}
