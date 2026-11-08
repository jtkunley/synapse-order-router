import express from 'express';
import { addDocs } from './controllers/docs.js';
import { addOpenApi } from './controllers/openapi.js';
import { addRoute } from './controllers/route.js';
import { handleError } from './middleware/error-handler.js';
import type { Catalog } from './models/catalog.js';

export function createApp(catalog: Catalog): express.Express {
  const app = express();
  app.disable('x-powered-by');

  addOpenApi(app);
  addDocs(app);
  addRoute(app, catalog);
  app.use(handleError);
  return app;
}
