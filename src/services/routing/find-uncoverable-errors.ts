import type { CategorizedLineItem, Order } from '../../models/order.js';
import type { EligibleSupplier } from './types.js';

/** One error per item whose category no eligible supplier covers (BR-015, BRX-009). */
export function findUncoverableErrors(
  order: Order,
  items: readonly CategorizedLineItem[],
  eligibleSuppliers: readonly EligibleSupplier[],
): string[] {
  // Every category at least one eligible supplier can cover.
  const available = new Set(eligibleSuppliers.flatMap((eligible) => [...eligible.covers]));

  const mailOrder = order.allowsMailOrder ? 'allowed' : 'disallowed';
  return items
    .filter((item) => !available.has(item.category))
    .map(
      (item) =>
        `No eligible supplier for ${item.productCode} (${item.category}) at ZIP ${order.customerZip} with mail order ${mailOrder}.`,
    );
}
