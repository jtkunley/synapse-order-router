import { z } from 'zod';
import { quantitySchema } from './order-request';
import type { RoutingDecision } from './routing-decision';

export const failureSchema = z.object({
  feasible: z.literal(false),
  errors: z.array(z.string()).min(1),
});

export const successSchema = z.object({
  feasible: z.literal(true),
  routing: z
    .array(
      z.object({
        supplier_id: z.string(),
        supplier_name: z.string(),
        items: z
          .array(
            z.object({
              product_code: z.string(),
              quantity: quantitySchema,
              category: z.string(),
              fulfillment_mode: z.enum(['local', 'mail_order']),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export const responseSchema = z.discriminatedUnion('feasible', [successSchema, failureSchema]);

export type RoutingResponse = z.infer<typeof responseSchema>;
export type RoutingSuccess = z.infer<typeof successSchema>;
export type RoutingFailure = z.infer<typeof failureSchema>;

/** Success response (BR-023); always sent with HTTP 200 (BR-022). */
export function getSuccessResponse(routing: RoutingSuccess['routing']): RoutingSuccess {
  return { feasible: true, routing };
}

/** Failure response (BR-024); always sent with HTTP 200 (BR-022). */
export function getFailureResponse(errors: string[]): RoutingFailure {
  return { feasible: false, errors };
}

/** Translate a domain routing decision into the response body. */
export function toRoutingResponse(decision: RoutingDecision): RoutingResponse {
  if (!decision.feasible) return getFailureResponse(decision.errors);

  return getSuccessResponse(
    decision.shipments.map(({ supplier, fulfillmentMode, lineItems }) => ({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: lineItems.map((lineItem) => ({
        product_code: lineItem.productCode,
        quantity: lineItem.quantity,
        category: lineItem.category,
        fulfillment_mode: fulfillmentMode,
      })),
    })),
  );
}
