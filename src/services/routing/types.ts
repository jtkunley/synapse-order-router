import type { RoutingResponse } from '../../models/routing.js';
import type { Supplier } from '../../models/supplier.js';

export const SIMILAR_RATING_DIFFERENCE = 0.5;
export const EPSILON = 1e-9;

export type Routing = Extract<RoutingResponse, { feasible: true }>['routing'];
export type RoutedItem = Routing[number]['items'][number];
export type OrderItem = Omit<RoutedItem, 'fulfillment_mode'>;

export interface Candidate {
  supplier: Supplier;
  mask: bigint;
  local: boolean;
  score: number;
  coverageCount: number;
}

export interface Plan {
  candidates: Candidate[];
  score: number;
  mailCount: number;
  ids: string;
}
