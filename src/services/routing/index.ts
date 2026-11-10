import type { Order } from '../../models/order.js';
import { getFailureResponse, getSuccessResponse } from '../../models/routing.js';
import type { RoutingResponse } from '../../models/routing.js';
import { buildCategoryBits } from './build-category-bits.js';
import { buildRouting } from './build-routing.js';
import { findEligibleCandidates } from './find-eligible-candidates.js';
import { findUncoverableErrors } from './find-uncoverable-errors.js';
import { normalizeOrderItems } from './normalize-order-items.js';
import { selectSuppliers } from './select-suppliers.js';

/**
 * Route one order against the loaded catalog. Failures use `feasible: false`
 * with errors; successes assign every requested quantity (BUS_RULE-027).
 */
export function routeOrder(order: Order): RoutingResponse {
  // 1. Combine repeated lines and resolve each product's category.
  const { items, errors } = normalizeOrderItems(order);
  if (errors.length) return getFailureResponse(errors);

  // 2. Give each ordered category one bit, so coverage can be checked as a mask.
  const { categoryBits, fullMask } = buildCategoryBits(items);

  // 3. Keep suppliers that serve this ZIP (or can mail) and stock an ordered category.
  const candidates = findEligibleCandidates(order, categoryBits);

  // 4. Fail when some category has no eligible supplier at all (BUS_RULE-015).
  const uncoverable = findUncoverableErrors(order, items, candidates, categoryBits);
  if (uncoverable.length) return getFailureResponse(uncoverable);

  // 5. Pick the fewest suppliers, then best quality and local preference (BUS_RULE-016…020).
  const selected = selectSuppliers(candidates, categoryBits, fullMask);

  // 6. Assign every item to the selected supplier that carries its category.
  return getSuccessResponse(buildRouting(items, selected));
}
