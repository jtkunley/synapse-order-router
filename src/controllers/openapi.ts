import type { Express } from 'express';
import { createDocument } from 'zod-openapi';
import { routePaths } from './route.js';

/** Machine-readable OpenAPI 3.1 document generated from the same Zod schemas used at runtime. */
export const openApiPath = '/openapi.json';

export function addOpenApi(app: Express): void {
  const specification = createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Synapse Order Router',
      version: '1.0.0',
      description:
        'Routes multi-item orders to eligible suppliers. Responses always use HTTP 200; check `feasible`.',
    },
    paths: routePaths,
  });
  app.get(openApiPath, (_request, response) => {
    response.json(specification);
  });
}
