import type { Express } from 'express';
import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi';

export const openApiPath = '/openapi.json';

export function registerOpenApi(app: Express, paths: ZodOpenApiPathsObject): void {
  const specification = createDocument({
    openapi: '3.1.0',
    info: { title: 'Synapse Order Router', version: '1.0.0' },
    paths,
  });
  app.get(openApiPath, (_request, response) => {
    response.json(specification);
  });
}
