import type { Order } from '../../models/order.js';
import { getFailureResponse } from '../../models/routing.js';
import type { RoutingResponse } from '../../models/routing.js';
import { buildCategoryBits } from './build-category-bits.js';
import { buildRouting } from './build-routing.js';
import { findEligibleCandidates } from './find-eligible-candidates.js';
import { normalizeOrderItems } from './normalize-order-items.js';
import { selectSuppliers } from './select-suppliers.js';
import { uncoverableErrors } from './uncoverable-errors.js';

/**
 * Route one order against the loaded catalog.
 *
 * Pipeline: normalize → category bitmasks → eligibility → uncoverable check →
 * select (BUS_RULE-015…020) → response shape. Failures always use `feasible: false`
 * with errors; successes assign every requested quantity (BUS_RULE-027).
 */
export function routeOrder(order: Order): RoutingResponse {
  const { items, errors } = normalizeOrderItems(order);
  if (errors.length) return getFailureResponse(errors);

  const { categoryBits, fullMask } = buildCategoryBits(items);
  const candidates = findEligibleCandidates(order, categoryBits);
  const uncovered = uncoverableErrors(order, items, candidates, categoryBits, fullMask);
  if (uncovered) return getFailureResponse(uncovered);

  const selected = selectSuppliers(candidates, fullMask, [...categoryBits.values()]);
  return { feasible: true, routing: buildRouting(items, selected) };
}
