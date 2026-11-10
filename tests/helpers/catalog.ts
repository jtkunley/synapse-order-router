import type { Catalog } from '../../src/models/catalog.js';
import type { Order } from '../../src/models/order.js';
import type { Supplier } from '../../src/models/supplier.js';

/** Serves only ZIP 10001, the default customer ZIP of `makeOrder`. */
export const LOCAL_ZIPS = [{ start: 10001, end: 10001 }];
/** Does not serve ZIP 10001. */
export const REMOTE_ZIPS = [{ start: 20000, end: 20000 }];

export function makeSupplier(
  overrides: Partial<Supplier> & Pick<Supplier, 'id' | 'supportedCategories'>,
): Supplier {
  return {
    name: overrides.name ?? overrides.id,
    serviceZipRanges: LOCAL_ZIPS,
    satisfactionScore: 5,
    canMailOrder: false,
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

export function makeOrder(overrides: Partial<Order> & Pick<Order, 'lineItems'>): Order {
  return {
    id: 'ORD-TEST',
    customerZip: '10001',
    allowsMailOrder: false,
    ...overrides,
  };
}
