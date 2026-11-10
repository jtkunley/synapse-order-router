import type { EligibleSupplier } from './eligible-supplier.js';

/** A proposed set of eligible suppliers capable of fulfilling the complete order. */
export interface RoutingPlan {
  suppliers: EligibleSupplier[];
  /** Sum of the suppliers' comparison scores (BRX-003). */
  totalSatisfaction: number;
  mailOrderShipmentCount: number;
  /** Supplier IDs in order, joined; the last tie-break between plans (BRX-005). */
  tieBreakKey: string;
}
