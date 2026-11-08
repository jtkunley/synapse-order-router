import type { Express } from 'express';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import type { Catalog } from '../models/catalog.js';
import { orderSchema } from '../models/order.js';
import { responseSchema } from '../models/routing.js';
import type { RoutingFailure } from '../models/routing.js';
import { routeOrder } from '../services/router.js';

export const routePath = '/api/route';

export const routePaths: ZodOpenApiPathsObject = {
  [routePath]: {
    post: {
      operationId: 'routeOrder',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: orderSchema } },
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

export function registerRoute(app: Express, catalog: Catalog): void {
  app.post(routePath, (request, response) => {
    const order = orderSchema.safeParse(request.body);
    if (!order.success) {
      const failure: RoutingFailure = {
        feasible: false,
        errors: order.error.issues.map(
          (issue) => `${issue.path.join('.') || 'order'}: ${issue.message}`,
        ),
      };
      response.status(200).json(failure);
      return;
    }
    response.status(200).json(responseSchema.parse(routeOrder(order.data, catalog)));
  });
}
