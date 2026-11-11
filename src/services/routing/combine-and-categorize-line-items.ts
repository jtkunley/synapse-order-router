import type { CategorizedLineItem, Order } from '../../models/order';
import { getCatalog } from '../catalog/index';
import { compareText } from './compare-text';

/**
 * Combine repeated line items (BRX-006) and look up each product category (BR-010).
 * Unknown products become errors (BRX-013); totals must stay exact integers (BRX-019).
 */
export function combineAndCategorizeLineItems(order: Order): {
  lineItems: CategorizedLineItem[];
  errors: string[];
} {
  const { products } = getCatalog();

  // 1. Combine repeated line items into one total quantity per product code.
  const totals = new Map<string, number>();
  for (const lineItem of order.lineItems) {
    const total = (totals.get(lineItem.productCode) ?? 0) + lineItem.quantity;
    totals.set(lineItem.productCode, total);
  }

  // 2. Sort by product code so line items and errors come out in a stable order.
  const sorted = [...totals].sort(([left], [right]) => compareText(left, right));

  const lineItems: CategorizedLineItem[] = [];
  const errors: string[] = [];
  for (const [productCode, quantity] of sorted) {
    // 3. Look up the product category; an unknown product cannot be routed.
    const category = products.get(productCode)?.category;
    if (category === undefined) {
      errors.push(`Unknown product code: ${productCode}.`);
    }

    // 4. Reject totals that are no longer exact integers after combining (BRX-019).
    if (!Number.isSafeInteger(quantity)) {
      errors.push(`Total quantity for ${productCode} is too large.`);
    }

    // 5. Keep known products; any error above still makes the whole order infeasible.
    if (category !== undefined) {
      lineItems.push({ productCode, quantity, category });
    }
  }

  return { lineItems, errors };
}
