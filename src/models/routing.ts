import { z } from 'zod';

const quantity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const failureSchema = z.object({
  feasible: z.literal(false),
  errors: z.array(z.string()).min(1),
});

export const responseSchema = z.discriminatedUnion('feasible', [
  z.object({
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
  }),
  failureSchema,
]);

export type RoutingResponse = z.infer<typeof responseSchema>;
export type RoutingFailure = z.infer<typeof failureSchema>;

/** Failure response (BUS_RULE-024); always sent with HTTP 200 (BUS_RULE-022). */
export function getFailure(errors: string[]): RoutingFailure {
  return { feasible: false, errors };
}
