import type { CategorizedLineItem } from '../../models/order';
import type { Shipment } from '../../models/routing-decision';
import type { RoutingPlan } from '../../models/routing-plan';
import { compareText } from './compare-text';

/**
 * Assign each line item, with its full quantity, to one supplier in the selected plan
 * (BR-023, BRX-007, BRX-008).
 */
export function assignLineItems(
  lineItems: readonly CategorizedLineItem[],
  plan: RoutingPlan,
): Shipment[] {
  // 1. One shipment per plan supplier, ordered by supplier ID.
  const shipments: Shipment[] = [...plan.suppliers]
    .sort((left, right) => compareText(left.supplier.id, right.supplier.id))
    .map(({ supplier, fulfillmentMode }) => ({ supplier, fulfillmentMode, lineItems: [] }));

  // 2. Each line item goes to the smallest-ID supplier that supports its category (BRX-008).
  for (const lineItem of lineItems) {
    const shipment = shipments.find(({ supplier }) =>
      supplier.supportedCategories.has(lineItem.category),
    )!;
    shipment.lineItems.push(lineItem);
  }

  return shipments;
}
