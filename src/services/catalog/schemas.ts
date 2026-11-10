import { z } from 'zod';
import type { Product } from '../../models/product.js';
import type { Supplier } from '../../models/supplier.js';

/** Zod parsers for the assessment CSV column shapes (BUS_RULE-004…007, BUS_RULE-008). */

const text = z.string().trim().min(1);
const category = text.toLowerCase();

const coverage = text.transform((value, context) => {
  const ranges: { start: number; end: number }[] = [];
  for (const entry of value.split(',')) {
    // Four-digit ZIPs in the supplied CSV have lost a leading zero.
    const match = /^(\d{4,5})(?:\s*-\s*(\d{4,5}))?$/.exec(entry.trim());
    const start = Number(match?.[1]);
    const end = Number(match?.[2] ?? match?.[1]);
    if (!match || start > end) {
      context.addIssue({ code: 'custom', message: `Invalid ZIP coverage: ${entry.trim()}` });
      return z.NEVER;
    }
    ranges.push({ start, end });
  }
  return ranges;
});

const rating = text.toLowerCase().pipe(
  z.union([
    z.literal('no ratings yet').transform(() => null),
    z
      .string()
      .regex(/^\d+(?:\.\d+)?$/)
      .transform(Number)
      .pipe(z.number().min(1).max(10)),
  ]),
);

export const productSchema: z.ZodType<Product> = z
  .object({ product_code: text, category })
  .transform((row) => ({ code: row.product_code, category: row.category }));

export const supplierSchema: z.ZodType<Supplier> = z
  .object({
    supplier_id: text,
    supplier_name: text,
    service_zips: coverage,
    product_categories: text
      .transform((value) => value.split(',').map((entry) => entry.trim().toLowerCase()))
      .pipe(z.array(category).min(1))
      .transform((categories) => new Set(categories)),
    customer_satisfaction_score: rating,
    'can_mail_order?': text
      .toLowerCase()
      .pipe(z.enum(['y', 'n']))
      .transform((value) => value === 'y'),
  })
  .transform((row) => ({
    id: row.supplier_id,
    name: row.supplier_name,
    zipRanges: row.service_zips,
    categories: row.product_categories,
    rating: row.customer_satisfaction_score,
    canMailOrder: row['can_mail_order?'],
  }));
