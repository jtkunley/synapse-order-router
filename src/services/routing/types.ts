import type { RoutingSuccess } from '../../models/routing.js';
import type { Supplier } from '../../models/supplier.js';

/** Max total-score gap (per selected supplier) that still counts as “similar” (OPEN-004). */
export const SIMILAR_RATING_DIFFERENCE = 0.5;
/** Score differences this small are floating-point noise and count as equal. */
export const SCORE_TOLERANCE = 1e-9;

export type Routing = RoutingSuccess['routing'];
export type RoutedItem = Routing[number]['items'][number];
export type OrderItem = Omit<RoutedItem, 'fulfillment_mode'>;

/** Eligible supplier for this order. */
export interface Candidate {
  supplier: Supplier;
  /** Ordered categories this supplier carries. */
  covers: ReadonlySet<string>;
  local: boolean;
  /** Unrated suppliers contribute 0 (OPEN-003). */
  score: number;
}

export interface Plan {
  candidates: Candidate[];
  score: number;
  mailCount: number;
  /** Sorted supplier ids, used for deterministic tie-breaks (OPEN-005). */
  supplierIds: string;
}
