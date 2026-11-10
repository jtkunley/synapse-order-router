import { z } from 'zod';
import type { Product } from '../../models/product.js';
import type { Supplier } from '../../models/supplier.js';

/** Zod parsers for the assessment CSV column shapes (BR-004…008, BRX-016…018). */

const text = z.string().trim().min(1);
const category = text.toLowerCase();

/** "10001-10099, 2134" → [{ start: 10001, end: 10099 }, { start: 2134, end: 2134 }]. */
const serviceZipRanges = text.transform((value, context) => {
  const ranges: { start: number; end: number }[] = [];
  for (const entry of value.split(',').map((part) => part.trim())) {
    const range = parseZipRange(entry);
    if (range === undefined) {
      context.addIssue({ code: 'custom', message: `Invalid ZIP coverage: ${entry}` });
      return z.NEVER;
    }
    ranges.push(range);
  }
  return ranges;
});

/** "No ratings yet" → null (BR-006); otherwise a number from 1 to 10. */
const unrated = z.literal('no ratings yet').transform(() => null);
const numericScore = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().min(1).max(10));
const satisfactionScore = text.toLowerCase().pipe(z.union([unrated, numericScore]));

/** "Wheelchair, Walker" → Set { "wheelchair", "walker" }; at least one category. */
const supportedCategories = text
  .transform((value) => value.split(','))
  .pipe(z.array(category).min(1))
  .transform((categories) => new Set(categories));

/** "Y" / "N" → true / false. */
const yesNo = text
  .toLowerCase()
  .pipe(z.enum(['y', 'n']))
  .transform((value) => value === 'y');

export const productSchema: z.ZodType<Product> = z
  .object({ product_code: text, category })
  .transform((row) => ({ code: row.product_code, category: row.category }));

export const supplierSchema: z.ZodType<Supplier> = z
  .object({
    supplier_id: text,
    supplier_name: text,
    service_zips: serviceZipRanges,
    product_categories: supportedCategories,
    customer_satisfaction_score: satisfactionScore,
    'can_mail_order?': yesNo,
  })
  .transform((row) => ({
    id: row.supplier_id,
    name: row.supplier_name,
    serviceZipRanges: row.service_zips,
    supportedCategories: row.product_categories,
    satisfactionScore: row.customer_satisfaction_score,
    canMailOrder: row['can_mail_order?'],
  }));

/**
 * "10001-10099" or a single "10001"; undefined when malformed or reversed.
 * Four-digit ZIPs in the supplied CSV have lost a leading zero.
 */
function parseZipRange(entry: string): { start: number; end: number } | undefined {
  const match = /^(?<start>\d{4,5})(?:\s*-\s*(?<end>\d{4,5}))?$/.exec(entry);
  if (!match?.groups) return undefined;
  const start = Number(match.groups.start);
  const end = Number(match.groups.end ?? match.groups.start);
  return start <= end ? { start, end } : undefined;
}
