import type { Order } from '../../models/order.js';
import { getFailureResponse, getSuccessResponse } from '../../models/routing.js';
import type { RoutingResponse } from '../../models/routing.js';
import { buildRouting } from './build-routing.js';
import { findEligibleSuppliers } from './find-eligible-suppliers.js';
import { findUncoverableErrors } from './find-uncoverable-errors.js';
import { listCategories } from './list-categories.js';
import { normalizeOrderItems } from './normalize-order-items.js';
import { selectEligibleSuppliers } from './select-eligible-suppliers.js';

/**
 * Route one order against the loaded catalog. Failures use `feasible: false`
 * with errors; successes assign every requested quantity (BR-027).
 */
export function routeOrder(order: Order): RoutingResponse {
  // 1. Combine repeated lines and resolve each product's category.
  const { items, errors } = normalizeOrderItems(order);
  if (errors.length) return getFailureResponse(errors);

  // 2. List the distinct categories the order needs covered.
  const categories = listCategories(items);

  // 3. Keep suppliers that serve this ZIP (or can mail) and carry an ordered category.
  const eligibleSuppliers = findEligibleSuppliers(order, categories);

  // 4. Fail when some category has no eligible supplier at all (BR-015, BRX-009).
  const uncoverable = findUncoverableErrors(order, items, eligibleSuppliers);
  if (uncoverable.length) return getFailureResponse(uncoverable);

  // 5. Pick the fewest suppliers, then best quality and local preference (BR-016…020).
  const selected = selectEligibleSuppliers(eligibleSuppliers, categories);

  // 6. Assign every item to the selected supplier that carries its category.
  return getSuccessResponse(buildRouting(items, selected));
}
