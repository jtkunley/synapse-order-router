import type { Candidate, OrderItem, Routing } from './types.js';

/**
 * Assign each normalized item to one selected supplier and set fulfillment_mode
 * (BUS_RULE-023, OPEN-006, OPEN-008). Local ZIP coverage wins over mail labeling.
 */
export function buildRouting(items: readonly OrderItem[], selected: readonly Candidate[]): Routing {
  const routing: Routing = selected.map(({ supplier }) => ({
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    items: [],
  }));

  for (const item of items) {
    const index = selected.findIndex(({ supplier }) => supplier.categories.has(item.category));
    routing[index]!.items.push({
      ...item,
      fulfillment_mode: selected[index]!.local ? 'local' : 'mail_order',
    });
  }

  return routing;
}
