import type { CategorizedLineItem, Order } from '../../models/order.js';
import { getCatalog } from '../catalog/index.js';
import { compareText } from './compare-text.js';

/**
 * Resolve catalog categories and combine duplicate product lines (BRX-006).
 * Unknown codes become errors (BRX-013); unsafe total quantities are a technical guard.
 */
export function normalizeOrderItems(order: Order): {
  items: CategorizedLineItem[];
  errors: string[];
} {
  const { products } = getCatalog();

  // 1. Combine repeated product lines into one total quantity per product code.
  const quantities = new Map<string, number>();
  for (const item of order.lineItems) {
    const total = (quantities.get(item.productCode) ?? 0) + item.quantity;
    quantities.set(item.productCode, total);
  }

  // 2. Sort by product code so items and errors come out in a stable order.
  const sorted = [...quantities].sort(([left], [right]) => compareText(left, right));

  const items: CategorizedLineItem[] = [];
  const errors: string[] = [];
  for (const [productCode, quantity] of sorted) {
    // 3. Look up the product's category; unknown codes cannot be routed.
    const category = products.get(productCode)?.category;
    if (category === undefined) {
      errors.push(`Unknown product code: ${productCode}.`);
    }

    // 4. Reject totals that are no longer exact integers after combining lines.
    if (!Number.isSafeInteger(quantity)) {
      errors.push(`Total quantity for ${productCode} is too large.`);
    }

    // 5. Keep known products; any error above still fails the whole order.
    if (category !== undefined) {
      items.push({ productCode, quantity, category });
    }
  }

  return { items, errors };
}
