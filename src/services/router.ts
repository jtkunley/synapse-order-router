import type { Catalog } from '../models/catalog.js';
import type { Order } from '../models/order.js';
import type { RoutingResponse } from '../models/routing.js';
import type { Supplier } from '../models/supplier.js';

const SIMILAR_RATING_DIFFERENCE = 0.5;
const EPSILON = 1e-9;

type Routing = Extract<RoutingResponse, { feasible: true }>['routing'];
type RoutedItem = Routing[number]['items'][number];

interface Candidate {
  supplier: Supplier;
  mask: bigint;
  local: boolean;
  score: number;
  coverageCount: number;
}

interface Plan {
  candidates: Candidate[];
  score: number;
  mailCount: number;
  ids: string;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function bitCount(mask: bigint): number {
  let count = 0;
  for (let bits = mask; bits !== 0n; bits &= bits - 1n) count++;
  return count;
}

function planIds(candidates: readonly Candidate[]): string {
  return candidates
    .map((candidate) => candidate.supplier.id)
    .sort(compareText)
    .join('\0');
}

function selectSuppliers(candidates: Candidate[], fullMask: bigint, bits: bigint[]): Candidate[] {
  const byCategory = bits
    .map((bit) => ({
      bit,
      options: candidates.filter((candidate) => (candidate.mask & bit) !== 0n),
    }))
    .sort((left, right) => left.options.length - right.options.length);

  // A greedy cover supplies an upper bound only; the search below is exact.
  let greedyMask = 0n;
  let minimumCount = 0;
  while (greedyMask !== fullMask) {
    let best = candidates[0]!;
    for (const candidate of candidates) {
      if (bitCount(candidate.mask & ~greedyMask) > bitCount(best.mask & ~greedyMask)) {
        best = candidate;
      }
    }
    greedyMask |= best.mask;
    minimumCount++;
  }

  const maximumCoverage = Math.max(...candidates.map((candidate) => candidate.coverageCount));
  const bestByMailCount = new Map<number, Plan>();
  const visited = new Map<string, { score: number; ids: string }>();

  function search(mask: bigint, chosen: Candidate[], score: number, mailCount: number): void {
    if (mask === fullMask) {
      if (chosen.length < minimumCount) {
        minimumCount = chosen.length;
        bestByMailCount.clear();
      }
      if (chosen.length !== minimumCount) return;
      const ids = planIds(chosen);
      const previous = bestByMailCount.get(mailCount);
      if (
        !previous ||
        score > previous.score + EPSILON ||
        (Math.abs(score - previous.score) <= EPSILON && compareText(ids, previous.ids) < 0)
      ) {
        bestByMailCount.set(mailCount, { candidates: [...chosen], score, mailCount, ids });
      }
      return;
    }
    const remaining = fullMask & ~mask;
    if (chosen.length + Math.ceil(bitCount(remaining) / maximumCoverage) > minimumCount) return;

    // With identical coverage/count/mode, future options are identical: a chosen
    // supplier cannot cover an uncovered category. Retain the best quality prefix.
    const key = `${mask}:${chosen.length}:${mailCount}`;
    const ids = planIds(chosen);
    const previous = visited.get(key);
    if (
      previous &&
      (previous.score > score + EPSILON ||
        (Math.abs(previous.score - score) <= EPSILON && compareText(previous.ids, ids) <= 0))
    ) {
      return;
    }
    visited.set(key, { score, ids });

    const category = byCategory.find(({ bit }) => (remaining & bit) !== 0n)!;
    for (const candidate of category.options) {
      chosen.push(candidate);
      search(
        mask | candidate.mask,
        chosen,
        score + candidate.score,
        mailCount + Number(!candidate.local),
      );
      chosen.pop();
    }
  }

  search(0n, [], 0, 0);
  const plans = [...bestByMailCount.values()];
  const highestScore = Math.max(...plans.map((plan) => plan.score));
  const similarPlans = plans.filter(
    (plan) => highestScore - plan.score <= SIMILAR_RATING_DIFFERENCE * minimumCount + EPSILON,
  );
  similarPlans.sort(
    (left, right) =>
      left.mailCount - right.mailCount ||
      right.score - left.score ||
      compareText(left.ids, right.ids),
  );
  return similarPlans[0]!.candidates.sort((left, right) =>
    compareText(left.supplier.id, right.supplier.id),
  );
}

export function routeOrder(order: Order, catalog: Catalog): RoutingResponse {
  const quantities = new Map<string, number>();
  for (const item of order.items) {
    quantities.set(item.product_code, (quantities.get(item.product_code) ?? 0) + item.quantity);
  }
  const errors: string[] = [];
  const items: Omit<RoutedItem, 'fulfillment_mode'>[] = [];
  for (const [product_code, quantity] of [...quantities].sort(([left], [right]) =>
    compareText(left, right),
  )) {
    const category = catalog.products.get(product_code);
    if (category === undefined) errors.push(`Unknown product code: ${product_code}.`);
    if (!Number.isSafeInteger(quantity))
      errors.push(`Total quantity for ${product_code} is too large.`);
    if (category !== undefined) items.push({ product_code, quantity, category });
  }
  if (errors.length) return { feasible: false, errors };

  const categories = [...new Set(items.map((item) => item.category))].sort(compareText);
  const categoryBits = new Map(
    categories.map((category, index) => [category, 1n << BigInt(index)]),
  );
  const fullMask = (1n << BigInt(categories.length)) - 1n;
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
  const candidates = [...byCoverageAndMode.values()].sort(
    (left, right) =>
      right.coverageCount - left.coverageCount ||
      right.score - left.score ||
      Number(right.local) - Number(left.local) ||
      compareText(left.supplier.id, right.supplier.id),
  );
  const availableMask = candidates.reduce((mask, candidate) => mask | candidate.mask, 0n);
  if (availableMask !== fullMask) {
    return {
      feasible: false,
      errors: items
        .filter((item) => (availableMask & categoryBits.get(item.category)!) === 0n)
        .map(
          (item) =>
            `No eligible supplier for ${item.product_code} (${item.category}) at ZIP ${order.customer_zip} with mail order ${order.mail_order ? 'allowed' : 'disallowed'}.`,
        ),
    };
  }

  const selected = selectSuppliers(candidates, fullMask, [...categoryBits.values()]);
  const routing: Routing = selected.map(({ supplier }) => ({
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    items: [],
  }));
  for (const item of items) {
    const index = selected.findIndex(({ supplier }) => supplier.categories.has(item.category));
    routing[index]!.items.push({
      ...item,
      fulfillment_mode: selected[index]!.local ? 'local' : 'mail_order',
    });
  }
  return { feasible: true, routing };
}
