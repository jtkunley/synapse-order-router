import { z } from 'zod';
import type { Order } from './order.js';

export const quantitySchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** `POST /api/route` request body (BR-001, BR-025, BRX-010, BRX-016, BRX-019). */
export const orderRequestSchema = z.object({
  order_id: z.string().trim().min(1),
  customer_zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Must be a five-digit ZIP code.'),
  mail_order: z.boolean(),
  items: z
    .array(z.object({ product_code: z.string().trim().min(1), quantity: quantitySchema }))
    .min(1, 'Order must include at least one line item.'),
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;

/** Translate a validated request into the domain order. */
export function toOrder(request: OrderRequest): Order {
  return {
    id: request.order_id,
    customerZip: request.customer_zip,
    allowsMailOrder: request.mail_order,
    lineItems: request.items.map((item) => ({
      productCode: item.product_code,
      quantity: item.quantity,
    })),
  };
}
