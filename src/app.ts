import express from 'express';
import { getEnv } from './config/env.js';
import { addDocs } from './controllers/docs.js';
import { addOpenApi } from './controllers/openapi.js';
import { addRoute } from './controllers/route.js';
import { handleError } from './middleware/error-handler.js';
import type { Catalog } from './models/catalog.js';
import { loadCatalog } from './services/catalog/index.js';

export async function createApp(): Promise<express.Express> {
  const { dataDir } = getEnv();
  let catalog: Catalog | undefined;
  try {
    catalog = await loadCatalog(dataDir);
  } catch (error) {
    // OPEN-007: serve docs and report the outage per request instead of refusing to start.
    console.error('Catalog unavailable', error);
  }

  const app = express();
  app.disable('x-powered-by');

  addOpenApi(app);
  addDocs(app);
  addRoute(app, catalog);
  app.use(handleError);
  return app;
}
