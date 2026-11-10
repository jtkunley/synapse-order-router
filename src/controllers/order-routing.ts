import type { Request, Response } from 'express';
import { orderSchema } from '../models/order.js';
import { getFailureResponse, responseSchema } from '../models/routing.js';
import { routeOrder } from '../services/routing/index.js';

/** Order-routing endpoint (BUS_RULE-021…027). Always HTTP 200; outcome is `feasible`. */
export const orderRoutingPath = '/api/route';

export function handleOrderRouting(request: Request, response: Response): void {
  // Validate the request body. safeParse returns every issue instead of throwing, so all
  // validation errors are reported together as a feasible: false response (BUS_RULE-024…026).
  const order = orderSchema.safeParse(request.body);

  // validation failed, return a failure response
  if (!order.success) {
    const errors = order.error.issues.map(
      (issue) => `${issue.path.join('.') || 'order'}: ${issue.message}`,
    );
    response.status(200).json(getFailureResponse(errors));
    return;
  }

  // validation successful, route the order and return the response
  response.status(200).json(responseSchema.parse(routeOrder(order.data)));
}
