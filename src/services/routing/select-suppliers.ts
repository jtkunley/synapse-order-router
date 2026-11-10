import { bitCount } from './bit-count.js';
import { compareText } from './compare-text.js';
import { planIds } from './plan-ids.js';
import { EPSILON, SIMILAR_RATING_DIFFERENCE, type Candidate, type Plan } from './types.js';

type Ranked = Pick<Plan, 'score' | 'ids'>;

/**
 * Choose a minimum-shipment cover, then apply quality and local preference
 * (BUS_RULE-016…019, OPEN-002…005). Search is exact within the pruned candidate set.
 */
export function selectSuppliers(
  candidates: Candidate[],
  categoryBits: ReadonlyMap<string, bigint>,
  fullMask: bigint,
): Candidate[] {
  // 1. A quick greedy cover gives an upper bound on how many suppliers are needed.
  const greedyCount = countGreedyCover(candidates, fullMask);

  // 2. Exact search: the best plan per mail-shipment count among the smallest covers.
  const { plans, supplierCount } = findMinimumPlans(
    candidates,
    categoryBits,
    fullMask,
    greedyCount,
  );

  // 3. Among plans of similar quality, prefer fewer mail shipments.
  const plan = choosePlan(plans, supplierCount);

  return [...plan.candidates].sort((left, right) =>
    compareText(left.supplier.id, right.supplier.id),
  );
}

/** Number of suppliers a greedy cover uses; every category is known to be coverable. */
function countGreedyCover(candidates: readonly Candidate[], fullMask: bigint): number {
  const newCoverage = (candidate: Candidate, covered: bigint) =>
    bitCount(candidate.mask & ~covered);

  let covered = 0n;
  let count = 0;
  while (covered !== fullMask) {
    // Take the supplier that adds the most still-uncovered categories.
    let best = candidates[0]!;
    for (const candidate of candidates) {
      if (newCoverage(candidate, covered) > newCoverage(best, covered)) best = candidate;
    }
    covered |= best.mask;
    count++;
  }
  return count;
}

/** Depth-first search for every smallest cover, keeping the best plan per mail-shipment count. */
function findMinimumPlans(
  candidates: readonly Candidate[],
  categoryBits: ReadonlyMap<string, bigint>,
  fullMask: bigint,
  upperBound: number,
): { plans: Plan[]; supplierCount: number } {
  // Branch on categories with the fewest options first; it keeps the search tree narrow.
  const byCategory = [...categoryBits.values()]
    .map((bit) => ({
      bit,
      options: candidates.filter((candidate) => (candidate.mask & bit) !== 0n),
    }))
    .sort((left, right) => left.options.length - right.options.length);
  const maximumCoverage = Math.max(...candidates.map((candidate) => candidate.coverageCount));

  let supplierCount = upperBound;
  const bestByMailCount = new Map<number, Plan>();
  const visited = new Map<string, Ranked>();

  function recordPlan(chosen: Candidate[], score: number, mailCount: number): void {
    // A smaller cover makes every larger plan found so far irrelevant.
    if (chosen.length < supplierCount) {
      supplierCount = chosen.length;
      bestByMailCount.clear();
    }
    if (chosen.length !== supplierCount) return;

    const ids = planIds(chosen);
    const previous = bestByMailCount.get(mailCount);
    if (!previous || isBetter({ score, ids }, previous)) {
      bestByMailCount.set(mailCount, { candidates: [...chosen], score, mailCount, ids });
    }
  }

  function search(mask: bigint, chosen: Candidate[], score: number, mailCount: number): void {
    if (mask === fullMask) {
      recordPlan(chosen, score, mailCount);
      return;
    }

    // Prune: even the widest suppliers could not finish within the current smallest size.
    const remaining = fullMask & ~mask;
    const fewestStillNeeded = Math.ceil(bitCount(remaining) / maximumCoverage);
    if (chosen.length + fewestStillNeeded > supplierCount) return;

    // Prune: the same coverage, size, and mail count was already reached with equal or
    // better quality. The remaining choices are identical, so this branch cannot win.
    const key = `${mask}:${chosen.length}:${mailCount}`;
    const current = { score, ids: planIds(chosen) };
    const previous = visited.get(key);
    if (previous && !isBetter(current, previous)) return;
    visited.set(key, current);

    // Branch on the first uncovered category: every cover includes one of its options.
    const next = byCategory.find(({ bit }) => (remaining & bit) !== 0n)!;
    for (const candidate of next.options) {
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
  return { plans: [...bestByMailCount.values()], supplierCount };
}

/** Similar-quality plans compete on fewer mail shipments (OPEN-004, OPEN-005). */
function choosePlan(plans: Plan[], supplierCount: number): Plan {
  // Plans within the allowance of the best total score count as similar.
  const highestScore = Math.max(...plans.map((plan) => plan.score));
  const allowance = SIMILAR_RATING_DIFFERENCE * supplierCount + EPSILON;
  const similar = plans.filter((plan) => highestScore - plan.score <= allowance);

  // Fewer mail shipments, then higher score, then smaller supplier ids.
  similar.sort(
    (left, right) =>
      left.mailCount - right.mailCount ||
      right.score - left.score ||
      compareText(left.ids, right.ids),
  );
  return similar[0]!;
}

/** Higher score wins; equal scores (within EPSILON) fall back to smaller supplier ids. */
function isBetter(current: Ranked, previous: Ranked): boolean {
  const difference = current.score - previous.score;
  if (Math.abs(difference) <= EPSILON) return compareText(current.ids, previous.ids) < 0;
  return difference > 0;
}
