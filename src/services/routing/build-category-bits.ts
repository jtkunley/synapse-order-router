import { compareText } from './compare-text.js';
import type { OrderItem } from './types.js';

export function buildCategoryBits(items: readonly OrderItem[]): {
  categoryBits: Map<string, bigint>;
  fullMask: bigint;
} {
  const categories = [...new Set(items.map((item) => item.category))].sort(compareText);
  const categoryBits = new Map(
    categories.map((category, index) => [category, 1n << BigInt(index)]),
  );
  const fullMask = (1n << BigInt(categories.length)) - 1n;
  return { categoryBits, fullMask };
}
