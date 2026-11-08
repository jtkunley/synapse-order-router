import type { Supplier } from './supplier.js';

export interface Catalog {
  products: ReadonlyMap<string, string>;
  suppliers: readonly Supplier[];
}
