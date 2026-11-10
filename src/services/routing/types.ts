import type { RoutingSuccess } from '../../models/routing.js';
import type { Supplier } from '../../models/supplier.js';

/** Max total-score gap (per selected supplier) that still counts as “similar” (OPEN-004). */
export const SIMILAR_RATING_DIFFERENCE = 0.5;
export const EPSILON = 1e-9;

export type Routing = RoutingSuccess['routing'];
export type RoutedItem = Routing[number]['items'][number];
export type OrderItem = Omit<RoutedItem, 'fulfillment_mode'>;

/** Eligible supplier with the categories it can cover on this order encoded in `mask`. */
export interface Candidate {
  supplier: Supplier;
  mask: bigint;
  local: boolean;
  /** Unrated suppliers contribute 0 (OPEN-003). */
  score: number;
  coverageCount: number;
}

export interface Plan {
  candidates: Candidate[];
  score: number;
  mailCount: number;
  ids: string;
}
