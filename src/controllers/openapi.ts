import type { Express } from 'express';
import { createDocument } from 'zod-openapi';
import { routePaths } from './route.js';

export const openApiPath = '/openapi.json';

export function addOpenApi(app: Express): void {
  const specification = createDocument({
    openapi: '3.1.0',
    info: { title: 'Synapse Order Router', version: '1.0.0' },
    paths: routePaths,
  });
  app.get(openApiPath, (_request, response) => {
    response.json(specification);
  });
}
