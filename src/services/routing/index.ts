import type { Order } from '../../models/order';
import {
  getFeasibleDecision,
  getInfeasibleDecision,
  type RoutingDecision,
} from '../../models/routing-decision';
import { assignLineItems } from './assign-line-items';
import { combineAndCategorizeLineItems } from './combine-and-categorize-line-items';
import { findEligibleSuppliers } from './find-eligible-suppliers';
import { findUnfulfillableLineItemErrors } from './find-unfulfillable-line-item-errors';
import { listProductCategories } from './list-product-categories';
import { selectRoutingPlan } from './select-routing-plan';

/**
 * Route one order against the loaded catalog. An infeasible decision carries every
 * applicable error; a feasible decision assigns every requested quantity (BR-027).
 */
export function routeOrder(order: Order): RoutingDecision {
  // 1. Combine repeated line items and look up each product category.
  const { lineItems, errors } = combineAndCategorizeLineItems(order);
  if (errors.length) return getInfeasibleDecision(errors);

  // 2. List the distinct product categories the order needs.
  const productCategories = listProductCategories(lineItems);

  // 3. Keep suppliers that meet the geographic condition and support a needed category.
  const eligibleSuppliers = findEligibleSuppliers(order, productCategories);

  // 4. Infeasible when some line item has no eligible supplier at all (BR-015, BRX-009).
  const unfulfillable = findUnfulfillableLineItemErrors(order, lineItems, eligibleSuppliers);
  if (unfulfillable.length) return getInfeasibleDecision(unfulfillable);

  // 5. Select the routing plan: fewest shipments, then satisfaction, then local (BR-016…020).
  const plan = selectRoutingPlan(eligibleSuppliers, productCategories);

  // 6. The selected plan produces the routing decision: one shipment per plan supplier.
  return getFeasibleDecision(assignLineItems(lineItems, plan));
}
