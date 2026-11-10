import type { Order } from '../../models/order.js';
import { getCatalog } from '../catalog/index.js';
import { compareText } from './compare-text.js';
import type { EligibleSupplier } from './types.js';

/**
 * Build the supplier search space for this order (BR-011…014, BRX-001).
 * Keep the best-rated supplier per identical coverage and local/mail mode.
 */
export function findEligibleSuppliers(
  order: Order,
  categories: readonly string[],
): EligibleSupplier[] {
  const zip = Number(order.customer_zip);
  const bestByCoverageAndMode = new Map<string, EligibleSupplier>();

  for (const supplier of getCatalog().suppliers) {
    // 1. The supplier must cover the ZIP, or ship by mail when the order allows it.
    const local = supplier.serviceZipRanges.some(({ start, end }) => zip >= start && zip <= end);
    const byMail = order.mail_order && supplier.canMailOrder;
    if (!local && !byMail) continue;

    // 2. It must carry at least one ordered category.
    const covered = categories.filter((category) => supplier.supportedCategories.has(category));
    if (covered.length === 0) continue;

    // 3. With identical coverage and mode, a lower-rated supplier cannot improve a route.
    const eligible: EligibleSupplier = {
      supplier,
      covers: new Set(covered),
      local,
      score: supplier.satisfactionScore ?? 0,
    };
    const key = `${covered.join('\0')}:${local}`;
    const previous = bestByCoverageAndMode.get(key);
    if (!previous || outranks(eligible, previous)) {
      bestByCoverageAndMode.set(key, eligible);
    }
  }

  // 4. Widest coverage first so the search finds small covers early.
  return [...bestByCoverageAndMode.values()].sort(compareEligibleSuppliers);
}

/** Higher rating wins; equal ratings fall back to the smaller supplier id (BRX-005). */
function outranks(eligible: EligibleSupplier, previous: EligibleSupplier): boolean {
  if (eligible.score !== previous.score) return eligible.score > previous.score;
  return compareText(eligible.supplier.id, previous.supplier.id) < 0;
}

/** Wider coverage, then higher rating, then local, then supplier id. */
function compareEligibleSuppliers(left: EligibleSupplier, right: EligibleSupplier): number {
  return (
    right.covers.size - left.covers.size ||
    right.score - left.score ||
    Number(right.local) - Number(left.local) ||
    compareText(left.supplier.id, right.supplier.id)
  );
}
