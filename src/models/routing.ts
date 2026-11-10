import { z } from 'zod';

const quantity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

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
              quantity,
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

/** Success response (BUS_RULE-023); always sent with HTTP 200 (BUS_RULE-022). */
export function getSuccessResponse(routing: RoutingSuccess['routing']): RoutingSuccess {
  return { feasible: true, routing };
}

/** Failure response (BUS_RULE-024); always sent with HTTP 200 (BUS_RULE-022). */
export function getFailureResponse(errors: string[]): RoutingFailure {
  return { feasible: false, errors };
}
