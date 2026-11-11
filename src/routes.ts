import type { Express } from 'express';
import {
  docsBundlePath,
  docsCssPath,
  docsPath,
  handleDocs,
  handleDocsBundle,
  handleDocsCss,
} from './controllers/docs';
import { handleOpenApi, openApiPath } from './controllers/openapi';
import { handleOrderRouting, orderRoutingPath } from './controllers/order-routing';
import { jsonBody } from './middleware/json-body';

export function addRoutes(app: Express): void {
  app.get(openApiPath, handleOpenApi);
  app.get(docsPath, handleDocs);
  app.get(docsCssPath, handleDocsCss);
  app.get(docsBundlePath, handleDocsBundle);

  // order routing endpoint
  app.post(orderRoutingPath, jsonBody, handleOrderRouting);
}
