import type { Catalog } from '../../models/catalog.js';
import type { Order } from '../../models/order.js';
import { bitCount } from './bit-count.js';
import { compareText } from './compare-text.js';
import type { Candidate } from './types.js';

export function findEligibleCandidates(
  order: Order,
  catalog: Catalog,
  categoryBits: ReadonlyMap<string, bigint>,
): Candidate[] {
  const zip = Number(order.customer_zip);
  const byCoverageAndMode = new Map<string, Candidate>();

  for (const supplier of catalog.suppliers) {
    const local = supplier.zipRanges.some(({ start, end }) => zip >= start && zip <= end);
    if (!local && !(order.mail_order && supplier.canMailOrder)) continue;

    let mask = 0n;
    for (const category of supplier.categories) mask |= categoryBits.get(category) ?? 0n;
    if (mask === 0n) continue;

    const candidate: Candidate = {
      supplier,
      mask,
      local,
      score: supplier.rating ?? 0,
      coverageCount: bitCount(mask),
    };
    // Equal coverage and mode: a lower-rated supplier cannot improve a route.
    const key = `${mask}:${local}`;
    const previous = byCoverageAndMode.get(key);
    if (
      !previous ||
      candidate.score > previous.score ||
      (candidate.score === previous.score && compareText(supplier.id, previous.supplier.id) < 0)
    ) {
      byCoverageAndMode.set(key, candidate);
    }
  }

  return [...byCoverageAndMode.values()].sort(
    (left, right) =>
      right.coverageCount - left.coverageCount ||
      right.score - left.score ||
      Number(right.local) - Number(left.local) ||
      compareText(left.supplier.id, right.supplier.id),
  );
}
