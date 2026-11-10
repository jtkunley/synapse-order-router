import type { Product } from './product.js';
import type { Supplier } from './supplier.js';

export interface Catalog {
  /** Keyed by `Product.code`. */
  products: ReadonlyMap<string, Product>;
  suppliers: readonly Supplier[];
}
