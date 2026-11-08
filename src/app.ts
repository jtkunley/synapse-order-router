import express from 'express';
import { registerOpenApi } from './controllers/openapi.js';
import { registerRoute, routePath, routePaths } from './controllers/route.js';
import { handleError } from './middleware/error-handler.js';
import { jsonBody } from './middleware/json-body.js';
import type { Catalog } from './models/catalog.js';

export function createApp(catalog: Catalog): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(routePath, jsonBody);
  registerOpenApi(app, routePaths);
  registerRoute(app, catalog);
  app.use(handleError);
  return app;
}
