import type { Order } from '../../models/order.js';
import { getCatalog } from '../catalog/index.js';
import { compareText } from './compare-text.js';
import type { Candidate } from './types.js';

/**
 * Build the supplier search space for this order (BUS_RULE-011…014, OPEN-001).
 * Keep the best-rated supplier per identical coverage and local/mail mode.
 */
export function findEligibleCandidates(order: Order, categories: readonly string[]): Candidate[] {
  const zip = Number(order.customer_zip);
  const bestByCoverageAndMode = new Map<string, Candidate>();

  for (const supplier of getCatalog().suppliers) {
    // 1. The supplier must cover the ZIP, or ship by mail when the order allows it.
    const local = supplier.zipRanges.some(({ start, end }) => zip >= start && zip <= end);
    const byMail = order.mail_order && supplier.canMailOrder;
    if (!local && !byMail) continue;

    // 2. It must carry at least one ordered category.
    const covered = categories.filter((category) => supplier.categories.has(category));
    if (covered.length === 0) continue;

    // 3. With identical coverage and mode, a lower-rated supplier cannot improve a route.
    const candidate: Candidate = {
      supplier,
      covers: new Set(covered),
      local,
      score: supplier.rating ?? 0,
    };
    const key = `${covered.join('\0')}:${local}`;
    const previous = bestByCoverageAndMode.get(key);
    if (!previous || outranks(candidate, previous)) {
      bestByCoverageAndMode.set(key, candidate);
    }
  }

  // 4. Widest coverage first so the search finds small covers early.
  return [...bestByCoverageAndMode.values()].sort(compareCandidates);
}

/** Higher rating wins; equal ratings fall back to the smaller supplier id (OPEN-005). */
function outranks(candidate: Candidate, previous: Candidate): boolean {
  if (candidate.score !== previous.score) return candidate.score > previous.score;
  return compareText(candidate.supplier.id, previous.supplier.id) < 0;
}

/** Wider coverage, then higher rating, then local, then supplier id. */
function compareCandidates(left: Candidate, right: Candidate): number {
  return (
    right.covers.size - left.covers.size ||
    right.score - left.score ||
    Number(right.local) - Number(left.local) ||
    compareText(left.supplier.id, right.supplier.id)
  );
}
