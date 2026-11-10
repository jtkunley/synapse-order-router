import type { Supplier } from '../../models/supplier.js';

/** Max total-score gap (per selected supplier) that still counts as “similar” (BRX-004). */
export const SIMILAR_RATING_DIFFERENCE = 0.5;
/** Score differences this small are floating-point noise and count as equal. */
export const SCORE_TOLERANCE = 1e-9;

/** Eligible supplier for this order. */
export interface EligibleSupplier {
  supplier: Supplier;
  /** Ordered categories this supplier carries. */
  covers: ReadonlySet<string>;
  local: boolean;
  /** Unrated suppliers contribute 0 (BRX-003). */
  score: number;
}

export interface Plan {
  suppliers: EligibleSupplier[];
  score: number;
  mailCount: number;
  /** Sorted supplier ids, used for deterministic tie-breaks (BRX-005). */
  supplierIds: string;
}
