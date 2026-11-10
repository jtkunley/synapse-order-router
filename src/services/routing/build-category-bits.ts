import { compareText } from './compare-text.js';
import type { OrderItem } from './types.js';

/** Map each distinct order category to a bit so coverage can be tracked as a mask. */
export function buildCategoryBits(items: readonly OrderItem[]): {
  categoryBits: Map<string, bigint>;
  fullMask: bigint;
} {
  // Sorted distinct categories keep the bit assignment deterministic.
  const categories = [...new Set(items.map((item) => item.category))].sort(compareText);

  // The category at position i gets bit i.
  const categoryBits = new Map(
    categories.map((category, index) => [category, 1n << BigInt(index)]),
  );

  // Every ordered category covered: one bit set per category.
  const fullMask = (1n << BigInt(categories.length)) - 1n;

  return { categoryBits, fullMask };
}
