import type { CategorizedLineItem } from '../../models/order.js';
import type { Shipment } from '../../models/routing-decision.js';
import type { EligibleSupplier } from './types.js';

/**
 * Assign each normalized item to one selected supplier and set its fulfillment mode
 * (BR-023, BRX-007, BRX-008, BRX-015). Local ZIP coverage wins over mail labeling.
 */
export function buildRouting(
  items: readonly CategorizedLineItem[],
  selected: readonly EligibleSupplier[],
): Shipment[] {
  // 1. One shipment per selected supplier, in selection order.
  const shipments: Shipment[] = selected.map(({ supplier, local }) => ({
    supplier,
    fulfillmentMode: local ? 'local' : 'mail_order',
    lineItems: [],
  }));

  // 2. Each item goes to the first selected supplier that carries its category.
  for (const item of items) {
    const index = selected.findIndex(({ supplier }) =>
      supplier.supportedCategories.has(item.category),
    );
    shipments[index]!.lineItems.push(item);
  }

  return shipments;
}
