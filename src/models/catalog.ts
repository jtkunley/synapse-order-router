import type { Product } from './product';
import type { Supplier } from './supplier';

export interface Catalog {
  /** Keyed by `Product.code`. */
  products: ReadonlyMap<string, Product>;
  suppliers: readonly Supplier[];
}
