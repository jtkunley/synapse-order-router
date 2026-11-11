import type { Request, Response } from 'express';
import { formatIssues } from '../models/format-issues';
import { orderRequestSchema, toOrder } from '../models/order-request';
import { getFailureResponse, responseSchema, toRoutingResponse } from '../models/routing-response';
import { routeOrder } from '../services/routing/index';

/** Order-routing endpoint (BR-021…027). Always HTTP 200; outcome is `feasible`. */
export const orderRoutingPath = '/api/route';

export function handleOrderRouting(request: Request, response: Response): void {
  // Validate the request body. safeParse returns every issue instead of throwing, so all
  // validation errors are reported together as a feasible: false response (BR-024…026, BRX-010).
  const order = orderRequestSchema.safeParse(request.body);

  // validation failed, return a failure response
  if (!order.success) {
    response.status(200).json(getFailureResponse(formatIssues(order.error, 'order')));
    return;
  }

  // validation successful, route the order and return the response
  const decision = routeOrder(toOrder(order.data));

  // responseSchema.parse checks our own output against the published contract: a mismatch is
  // a bug, so it throws to the error handler instead of sending an off-spec body.
  response.status(200).json(responseSchema.parse(toRoutingResponse(decision)));
}
