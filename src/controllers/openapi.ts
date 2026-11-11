import type { Request, Response } from 'express';
import { createDocument } from 'zod-openapi';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { orderRequestSchema } from '../models/order-request';
import { responseSchema } from '../models/routing-response';
import { orderRoutingPath } from './order-routing';

/** Machine-readable OpenAPI 3.1 document generated from the same Zod schemas used at runtime. */
export const openApiPath = '/openapi.json';

const orderRoutingPaths: ZodOpenApiPathsObject = {
  [orderRoutingPath]: {
    post: {
      operationId: 'routeOrder',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: orderRequestSchema } },
      },
      responses: {
        '200': {
          description: 'The feasible field indicates whether the complete order was routed.',
          content: { 'application/json': { schema: responseSchema } },
        },
      },
    },
  },
};

const specification = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Synapse Order Router',
    version: '1.0.0',
    description:
      'Routes multi-item orders to eligible suppliers. Responses always use HTTP 200; check `feasible`.',
  },
  paths: orderRoutingPaths,
});

export function handleOpenApi(_request: Request, response: Response): void {
  response.json(specification);
}
