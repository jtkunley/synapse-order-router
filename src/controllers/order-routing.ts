import type { Request, Response } from 'express';
import { formatIssues } from '../models/format-issues.js';
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
    response.status(200).json(getFailureResponse(formatIssues(order.error, 'order')));
    return;
  }

  // validation successful, route the order and return the response
  // responseSchema.parse checks our own output against the published contract: a mismatch is
  // a bug, so it throws to the error handler instead of sending an off-spec body.
  response.status(200).json(responseSchema.parse(routeOrder(order.data)));
}
