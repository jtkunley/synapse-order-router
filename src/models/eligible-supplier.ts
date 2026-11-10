import type { FulfillmentMode } from './routing-decision.js';
import type { Supplier } from './supplier.js';

/**
 * A supplier that supports at least one of the order's product categories and meets the
 * geographic or mail-order condition (BR-011…014, BRX-001).
 */
export interface EligibleSupplier {
  supplier: Supplier;
  /** The order's product categories this supplier supports. */
  supportedOrderCategories: ReadonlySet<string>;
  fulfillmentMode: FulfillmentMode;
  /** Customer satisfaction score; an unrated supplier compares as zero (BRX-003). */
  comparisonScore: number;
}
