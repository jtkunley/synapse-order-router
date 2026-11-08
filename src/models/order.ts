import { z } from 'zod';

const quantity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const orderSchema = z.object({
  order_id: z.string().trim().min(1),
  customer_zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Must be a five-digit ZIP code.'),
  mail_order: z.boolean(),
  items: z
    .array(z.object({ product_code: z.string().trim().min(1), quantity }))
    .min(1, 'Order must include at least one line item.'),
});

export type Order = z.infer<typeof orderSchema>;
