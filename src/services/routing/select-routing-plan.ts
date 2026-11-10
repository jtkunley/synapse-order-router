import type { EligibleSupplier } from '../../models/eligible-supplier.js';
import type { RoutingPlan } from '../../models/routing-plan.js';
import { compareText } from './compare-text.js';
import { getTieBreakKey } from './get-tie-break-key.js';

/** Largest average-score gap below the best plan that still counts as similar (BRX-004). */
const SIMILAR_SATISFACTION_DIFFERENCE = 0.5;
/** Score differences this small are floating-point noise and count as equal. */
const SCORE_TOLERANCE = 1e-9;

type PlanRank = Pick<RoutingPlan, 'totalSatisfaction' | 'tieBreakKey'>;

/**
 * Select the routing plan: fewest shipments first, then customer satisfaction and local
 * fulfillment (BR-016…020, BRX-002…005). The search is exact over the eligible suppliers.
 */
export function selectRoutingPlan(
  eligibleSuppliers: readonly EligibleSupplier[],
  productCategories: readonly string[],
): RoutingPlan {
  // 1. Exact search: the best plan per mail-order shipment count among minimum-shipment plans.
  const plans = findMinimumShipmentPlans(eligibleSuppliers, productCategories);

  // 2. Among plans with similar satisfaction, prefer fewer mail-order shipments.
  return chooseRoutingPlan(plans);
}

/** Depth-first search for every minimum-shipment plan, keeping the best per mail-order count. */
function findMinimumShipmentPlans(
  eligibleSuppliers: readonly EligibleSupplier[],
  productCategories: readonly string[],
): RoutingPlan[] {
  // Branch on categories with the fewest suppliers first; it keeps the search tree narrow.
  const suppliersByCategory = productCategories
    .map((category) => ({
      category,
      suppliers: eligibleSuppliers.filter((eligible) =>
        eligible.supportedOrderCategories.has(category),
      ),
    }))
    .sort((left, right) => left.suppliers.length - right.suppliers.length);
  const mostCategoriesPerSupplier = Math.max(
    ...eligibleSuppliers.map((eligible) => eligible.supportedOrderCategories.size),
  );

  // One supplier per category always fulfills the order, so no plan needs more shipments.
  let fewestShipments = productCategories.length;
  const bestByMailOrderShipments = new Map<number, RoutingPlan>();
  const bestRankByState = new Map<string, PlanRank>();

  function recordPlan(
    selected: EligibleSupplier[],
    totalSatisfaction: number,
    mailOrderShipmentCount: number,
  ): void {
    // A plan with fewer shipments makes every larger plan found so far irrelevant.
    if (selected.length < fewestShipments) {
      fewestShipments = selected.length;
      bestByMailOrderShipments.clear();
    }
    if (selected.length !== fewestShipments) return;

    const tieBreakKey = getTieBreakKey(selected);
    const previous = bestByMailOrderShipments.get(mailOrderShipmentCount);
    if (!previous || outranks({ totalSatisfaction, tieBreakKey }, previous)) {
      bestByMailOrderShipments.set(mailOrderShipmentCount, {
        suppliers: [...selected],
        totalSatisfaction,
        mailOrderShipmentCount,
        tieBreakKey,
      });
    }
  }

  function search(
    supported: ReadonlySet<string>,
    selected: EligibleSupplier[],
    totalSatisfaction: number,
    mailOrderShipmentCount: number,
  ): void {
    if (supported.size === productCategories.length) {
      recordPlan(selected, totalSatisfaction, mailOrderShipmentCount);
      return;
    }

    // Prune: even the broadest suppliers could not finish within the fewest shipments so far.
    const remainingCount = productCategories.length - supported.size;
    const fewestStillNeeded = Math.ceil(remainingCount / mostCategoriesPerSupplier);
    if (selected.length + fewestStillNeeded > fewestShipments) return;

    // Prune: the same categories, shipments, and mail-order shipments were already reached
    // with equal or better satisfaction. The remaining choices are identical, so this cannot win.
    const supportedKey = productCategories.filter((category) => supported.has(category)).join('\0');
    const stateKey = `${supportedKey}:${selected.length}:${mailOrderShipmentCount}`;
    const rank = { totalSatisfaction, tieBreakKey: getTieBreakKey(selected) };
    const previous = bestRankByState.get(stateKey);
    if (previous && !outranks(rank, previous)) return;
    bestRankByState.set(stateKey, rank);

    // Branch on the first unsupported category: every plan includes one of its suppliers.
    const next = suppliersByCategory.find(({ category }) => !supported.has(category))!;
    for (const eligible of next.suppliers) {
      selected.push(eligible);
      search(
        new Set([...supported, ...eligible.supportedOrderCategories]),
        selected,
        totalSatisfaction + eligible.comparisonScore,
        mailOrderShipmentCount + (eligible.fulfillmentMode === 'mail_order' ? 1 : 0),
      );
      selected.pop();
    }
  }

  search(new Set(), [], 0, 0);
  return [...bestByMailOrderShipments.values()];
}

/** Similar-satisfaction plans compete on fewer mail-order shipments (BRX-004, BRX-005). */
function chooseRoutingPlan(plans: RoutingPlan[]): RoutingPlan {
  // Plans whose average score is within the allowance of the best average count as similar.
  const bestAverage = Math.max(...plans.map(averageSatisfaction));
  const similar = plans.filter(
    (plan) =>
      bestAverage - averageSatisfaction(plan) <= SIMILAR_SATISFACTION_DIFFERENCE + SCORE_TOLERANCE,
  );

  // Fewer mail-order shipments, then higher total satisfaction, then the tie-break key.
  similar.sort(
    (left, right) =>
      left.mailOrderShipmentCount - right.mailOrderShipmentCount ||
      right.totalSatisfaction - left.totalSatisfaction ||
      compareText(left.tieBreakKey, right.tieBreakKey),
  );
  return similar[0]!;
}

function averageSatisfaction(plan: RoutingPlan): number {
  return plan.totalSatisfaction / plan.suppliers.length;
}

/** Higher total satisfaction wins; equal totals fall back to the smaller tie-break key. */
function outranks(current: PlanRank, previous: PlanRank): boolean {
  const difference = current.totalSatisfaction - previous.totalSatisfaction;
  if (Math.abs(difference) <= SCORE_TOLERANCE) {
    return compareText(current.tieBreakKey, previous.tieBreakKey) < 0;
  }
  return difference > 0;
}
