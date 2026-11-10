import { compareText } from './compare-text.js';
import { planIds } from './plan-ids.js';
import {
  SCORE_TOLERANCE,
  SIMILAR_RATING_DIFFERENCE,
  type EligibleSupplier,
  type Plan,
} from './types.js';

type Ranked = Pick<Plan, 'score' | 'supplierIds'>;

/**
 * Choose a minimum-shipment cover, then apply quality and local preference
 * (BR-016…019, BRX-002…005). Search is exact over the given eligible suppliers.
 */
export function selectEligibleSuppliers(
  eligibleSuppliers: EligibleSupplier[],
  categories: readonly string[],
): EligibleSupplier[] {
  // 1. Exact search: the best plan per mail-shipment count among the smallest covers.
  const plans = findMinimumPlans(eligibleSuppliers, categories);

  // 2. Among plans of similar quality, prefer fewer mail shipments.
  const plan = choosePlan(plans);

  return [...plan.suppliers].sort((left, right) =>
    compareText(left.supplier.id, right.supplier.id),
  );
}

/** Depth-first search for every smallest cover, keeping the best plan per mail-shipment count. */
function findMinimumPlans(
  eligibleSuppliers: readonly EligibleSupplier[],
  categories: readonly string[],
): Plan[] {
  // Branch on categories with the fewest options first; it keeps the search tree narrow.
  const optionsByCategory = categories
    .map((category) => ({
      category,
      options: eligibleSuppliers.filter((eligible) => eligible.covers.has(category)),
    }))
    .sort((left, right) => left.options.length - right.options.length);
  const widestCoverage = Math.max(...eligibleSuppliers.map((eligible) => eligible.covers.size));

  // One supplier per category always covers the order, so no plan needs more than that.
  let supplierCount = categories.length;
  const bestByMailCount = new Map<number, Plan>();
  const visited = new Map<string, Ranked>();

  function recordPlan(chosen: EligibleSupplier[], score: number, mailCount: number): void {
    // A smaller cover makes every larger plan found so far irrelevant.
    if (chosen.length < supplierCount) {
      supplierCount = chosen.length;
      bestByMailCount.clear();
    }
    if (chosen.length !== supplierCount) return;

    const supplierIds = planIds(chosen);
    const previous = bestByMailCount.get(mailCount);
    if (!previous || isBetter({ score, supplierIds }, previous)) {
      bestByMailCount.set(mailCount, { suppliers: [...chosen], score, mailCount, supplierIds });
    }
  }

  function search(
    covered: ReadonlySet<string>,
    chosen: EligibleSupplier[],
    score: number,
    mailCount: number,
  ): void {
    if (covered.size === categories.length) {
      recordPlan(chosen, score, mailCount);
      return;
    }

    // Prune: even the widest suppliers could not finish within the current smallest size.
    const uncoveredCount = categories.length - covered.size;
    const fewestStillNeeded = Math.ceil(uncoveredCount / widestCoverage);
    if (chosen.length + fewestStillNeeded > supplierCount) return;

    // Prune: the same coverage, size, and mail count was already reached with equal or
    // better quality. The remaining choices are identical, so this branch cannot win.
    const coveredKey = categories.filter((category) => covered.has(category)).join('\0');
    const key = `${coveredKey}:${chosen.length}:${mailCount}`;
    const current = { score, supplierIds: planIds(chosen) };
    const previous = visited.get(key);
    if (previous && !isBetter(current, previous)) return;
    visited.set(key, current);

    // Branch on the first uncovered category: every cover includes one of its options.
    const next = optionsByCategory.find(({ category }) => !covered.has(category))!;
    for (const eligible of next.options) {
      chosen.push(eligible);
      search(
        new Set([...covered, ...eligible.covers]),
        chosen,
        score + eligible.score,
        mailCount + (eligible.local ? 0 : 1),
      );
      chosen.pop();
    }
  }

  search(new Set(), [], 0, 0);
  return [...bestByMailCount.values()];
}

/** Similar-quality plans compete on fewer mail shipments (BRX-004, BRX-005). */
function choosePlan(plans: Plan[]): Plan {
  // Every plan has the same (minimum) number of suppliers.
  const supplierCount = plans[0]!.suppliers.length;

  // Plans within the allowance of the best total score count as similar.
  const highestScore = Math.max(...plans.map((plan) => plan.score));
  const allowance = SIMILAR_RATING_DIFFERENCE * supplierCount + SCORE_TOLERANCE;
  const similar = plans.filter((plan) => highestScore - plan.score <= allowance);

  // Fewer mail shipments, then higher score, then smaller supplier ids.
  similar.sort(
    (left, right) =>
      left.mailCount - right.mailCount ||
      right.score - left.score ||
      compareText(left.supplierIds, right.supplierIds),
  );
  return similar[0]!;
}

/** Higher score wins; equal scores (within SCORE_TOLERANCE) fall back to smaller supplier ids. */
function isBetter(current: Ranked, previous: Ranked): boolean {
  const difference = current.score - previous.score;
  if (Math.abs(difference) <= SCORE_TOLERANCE) {
    return compareText(current.supplierIds, previous.supplierIds) < 0;
  }
  return difference > 0;
}
