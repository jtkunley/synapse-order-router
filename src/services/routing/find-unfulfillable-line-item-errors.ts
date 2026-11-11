import type { EligibleSupplier } from '../../models/eligible-supplier';
import type { CategorizedLineItem, Order } from '../../models/order';

/** One error per line item whose category no eligible supplier supports (BR-015, BRX-009). */
export function findUnfulfillableLineItemErrors(
  order: Order,
  lineItems: readonly CategorizedLineItem[],
  eligibleSuppliers: readonly EligibleSupplier[],
): string[] {
  // Every product category at least one eligible supplier supports.
  const fulfillableCategories = new Set(
    eligibleSuppliers.flatMap((eligible) => [...eligible.supportedOrderCategories]),
  );

  const mailOrder = order.allowsMailOrder ? 'allowed' : 'disallowed';
  return lineItems
    .filter((lineItem) => !fulfillableCategories.has(lineItem.category))
    .map(
      (lineItem) =>
        `No eligible supplier for ${lineItem.productCode} (${lineItem.category}) at ZIP ${order.customerZip} with mail order ${mailOrder}.`,
    );
}
