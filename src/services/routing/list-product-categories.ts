import type { CategorizedLineItem } from '../../models/order';
import { compareText } from './compare-text';

/** Distinct product categories in the order, sorted so plan selection is deterministic. */
export function listProductCategories(lineItems: readonly CategorizedLineItem[]): string[] {
  return [...new Set(lineItems.map((lineItem) => lineItem.category))].sort(compareText);
}
