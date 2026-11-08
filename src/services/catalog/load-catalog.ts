import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Catalog } from '../../models/catalog.js';
import { readRows } from './read-rows.js';
import { productSchema, supplierSchema } from './schemas.js';

/**
 * Load `products.csv` and `suppliers.csv` from a directory (BUS_RULE-002…007).
 * Conflicting or duplicate reference data fails fast at boot (OPEN-007).
 */
export async function loadCatalog(directory: string): Promise<Catalog> {
  const [productCsv, supplierCsv] = await Promise.all([
    readFile(join(directory, 'products.csv'), 'utf8'),
    readFile(join(directory, 'suppliers.csv'), 'utf8'),
  ]);
  const products = new Map<string, string>();
  for (const product of readRows(productCsv, 'products.csv', productSchema)) {
    const existing = products.get(product.product_code);
    if (existing !== undefined && existing !== product.category) {
      throw new Error(`products.csv: conflicting categories for ${product.product_code}.`);
    }
    // Identical product records occur in the supplied data; they are one catalog entry.
    products.set(product.product_code, product.category);
  }
  const suppliers = readRows(supplierCsv, 'suppliers.csv', supplierSchema);
  const supplierIds = new Set<string>();
  for (const supplier of suppliers) {
    if (supplierIds.has(supplier.id)) {
      throw new Error(`suppliers.csv: duplicate supplier ID ${supplier.id}.`);
    }
    supplierIds.add(supplier.id);
  }
  return { products, suppliers };
}
