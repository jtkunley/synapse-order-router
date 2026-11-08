import type { Catalog } from '../../models/catalog.js';
import type { Order } from '../../models/order.js';
import { compareText } from './compare-text.js';
import type { OrderItem } from './types.js';

/**
 * Resolve catalog categories and combine duplicate product lines (OPEN-006).
 * Unknown codes and unsafe total quantities become errors (OPEN-007).
 */
export function normalizeItems(
  order: Order,
  catalog: Catalog,
): { items: OrderItem[]; errors: string[] } {
  const quantities = new Map<string, number>();
  for (const item of order.items) {
    quantities.set(item.product_code, (quantities.get(item.product_code) ?? 0) + item.quantity);
  }

  const errors: string[] = [];
  const items: OrderItem[] = [];
  for (const [product_code, quantity] of [...quantities].sort(([left], [right]) =>
    compareText(left, right),
  )) {
    const category = catalog.products.get(product_code);
    if (category === undefined) errors.push(`Unknown product code: ${product_code}.`);
    if (!Number.isSafeInteger(quantity)) {
      errors.push(`Total quantity for ${product_code} is too large.`);
    }
    if (category !== undefined) items.push({ product_code, quantity, category });
  }

  return { items, errors };
}
