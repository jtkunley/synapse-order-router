import { compareText } from './compare-text.js';
import type { CategorizedLineItem } from '../../models/order.js';

/** Distinct ordered categories, sorted so the supplier search is deterministic. */
export function listCategories(items: readonly CategorizedLineItem[]): string[] {
  return [...new Set(items.map((item) => item.category))].sort(compareText);
}
