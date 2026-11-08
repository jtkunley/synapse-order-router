import type { Candidate, OrderItem, Routing } from './types.js';

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
