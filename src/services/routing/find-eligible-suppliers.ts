import type { EligibleSupplier } from '../../models/eligible-supplier';
import type { Order } from '../../models/order';
import { getCatalog } from '../catalog/index';
import { compareText } from './compare-text';

/**
 * Find the suppliers eligible for this order (BR-011…014, BRX-001). Keep only the
 * best-scored supplier per identical supported categories and fulfillment mode.
 */
export function findEligibleSuppliers(
  order: Order,
  productCategories: readonly string[],
): EligibleSupplier[] {
  const customerZip = Number(order.customerZip);
  const bestByCategoriesAndMode = new Map<string, EligibleSupplier>();

  for (const supplier of getCatalog().suppliers) {
    // 1. Geographic condition: serve the customer's ZIP, or ship by mail when the order allows it.
    const servesZip = supplier.serviceZipRanges.some(
      ({ start, end }) => customerZip >= start && customerZip <= end,
    );
    const shipsByMail = order.allowsMailOrder && supplier.canMailOrder;
    const meetsGeographicCondition = servesZip || shipsByMail;
    if (!meetsGeographicCondition) continue;

    // 2. It must support at least one of the order's product categories.
    const supportedOrderCategories = productCategories.filter((category) =>
      supplier.supportedCategories.has(category),
    );
    if (supportedOrderCategories.length === 0) continue;

    const eligible: EligibleSupplier = {
      supplier,
      supportedOrderCategories: new Set(supportedOrderCategories),
      // A supplier that serves the ZIP is local even if it can also mail (BRX-015).
      fulfillmentMode: servesZip ? 'local' : 'mail_order',
      comparisonScore: supplier.satisfactionScore ?? 0,
    };

    // 3. With the same categories and mode, a lower-scored supplier cannot improve a plan.
    const key = `${supportedOrderCategories.join('\0')}:${eligible.fulfillmentMode}`;
    const previous = bestByCategoriesAndMode.get(key);
    if (!previous || outranks(eligible, previous)) {
      bestByCategoriesAndMode.set(key, eligible);
    }
  }

  // 4. Most supported categories first so plan selection finds small plans early.
  return [...bestByCategoriesAndMode.values()].sort(compareEligibleSuppliers);
}

/** Higher score wins; equal scores fall back to the smaller supplier ID (BRX-005). */
function outranks(eligible: EligibleSupplier, previous: EligibleSupplier): boolean {
  if (eligible.comparisonScore !== previous.comparisonScore) {
    return eligible.comparisonScore > previous.comparisonScore;
  }
  return compareText(eligible.supplier.id, previous.supplier.id) < 0;
}

/** More supported categories, then higher score, then local, then supplier ID. */
function compareEligibleSuppliers(left: EligibleSupplier, right: EligibleSupplier): number {
  return (
    right.supportedOrderCategories.size - left.supportedOrderCategories.size ||
    right.comparisonScore - left.comparisonScore ||
    localFirst(left) - localFirst(right) ||
    compareText(left.supplier.id, right.supplier.id)
  );
}

function localFirst(eligible: EligibleSupplier): number {
  return eligible.fulfillmentMode === 'local' ? 0 : 1;
}
