import type { EligibleSupplier, OrderItem, Routing } from './types.js';

/**
 * Assign each normalized item to one selected supplier and set fulfillment_mode
 * (BUS_RULE-023, OPEN-006, OPEN-008). Local ZIP coverage wins over mail labeling.
 */
export function buildRouting(
  items: readonly OrderItem[],
  selected: readonly EligibleSupplier[],
): Routing {
  // 1. One routing group per selected supplier, in selection order.
  const routing: Routing = selected.map(({ supplier }) => ({
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    items: [],
  }));

  // 2. Each item goes to the first selected supplier that carries its category.
  for (const item of items) {
    const index = selected.findIndex(({ supplier }) => supplier.categories.has(item.category));
    const fulfillment_mode = selected[index]!.local ? 'local' : 'mail_order';
    routing[index]!.items.push({ ...item, fulfillment_mode });
  }

  return routing;
}
