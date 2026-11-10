import type { CategorizedLineItem } from './order.js';
import type { Supplier } from './supplier.js';

/** Supported fulfillment modes (BRX-014). */
export type FulfillmentMode = 'local' | 'mail_order';

/** The portion of an order assigned to one supplier (BRX-002). */
export interface Shipment {
  supplier: Supplier;
  fulfillmentMode: FulfillmentMode;
  lineItems: CategorizedLineItem[];
}

/** The complete order assigned to suppliers (BR-023, BR-027). */
export interface FeasibleDecision {
  feasible: true;
  shipments: Shipment[];
}

/** The order cannot be routed, with every applicable reason (BR-024, BR-026). */
export interface InfeasibleDecision {
  feasible: false;
  errors: string[];
}

export type RoutingDecision = FeasibleDecision | InfeasibleDecision;

export function getFeasibleDecision(shipments: Shipment[]): FeasibleDecision {
  return { feasible: true, shipments };
}

export function getInfeasibleDecision(errors: string[]): InfeasibleDecision {
  return { feasible: false, errors };
}
