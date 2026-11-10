import type { Catalog } from '../../src/models/catalog.js';
import type { Order } from '../../src/models/order.js';
import type { Supplier } from '../../src/models/supplier.js';

export function makeSupplier(
  overrides: Partial<Supplier> & Pick<Supplier, 'id' | 'categories'>,
): Supplier {
  return {
    name: overrides.name ?? overrides.id,
    zipRanges: overrides.zipRanges ?? [{ start: 10001, end: 10001 }],
    rating: overrides.rating ?? 5,
    canMailOrder: overrides.canMailOrder ?? false,
    ...overrides,
  };
}

export function makeCatalog(
  products: Record<string, string>,
  suppliers: readonly Supplier[],
): Catalog {
  return {
    products: new Map(
      Object.entries(products).map(([code, category]) => [code, { code, category }]),
    ),
    suppliers,
  };
}

export function makeOrder(overrides: Partial<Order> & Pick<Order, 'items'>): Order {
  return {
    order_id: overrides.order_id ?? 'ORD-TEST',
    customer_zip: overrides.customer_zip ?? '10001',
    mail_order: overrides.mail_order ?? false,
    items: overrides.items,
  };
}
