import type { Express } from 'express';
import {
  docsBundlePath,
  docsCssPath,
  docsPath,
  handleDocs,
  handleDocsBundle,
  handleDocsCss,
} from './controllers/docs.js';
import { handleOpenApi, openApiPath } from './controllers/openapi.js';
import { handleRoute, routePath } from './controllers/route.js';
import { jsonBody } from './middleware/json-body.js';

export function addRoutes(app: Express): void {
  app.get(openApiPath, handleOpenApi);
  app.get(docsPath, handleDocs);
  app.get(docsCssPath, handleDocsCss);
  app.get(docsBundlePath, handleDocsBundle);

  // order routing endpoint
  app.post(routePath, jsonBody, handleRoute);
}
