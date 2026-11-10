import { compareText } from './compare-text.js';
import type { OrderItem } from './types.js';

/** Distinct ordered categories, sorted so the supplier search is deterministic. */
export function listCategories(items: readonly OrderItem[]): string[] {
  return [...new Set(items.map((item) => item.category))].sort(compareText);
}
