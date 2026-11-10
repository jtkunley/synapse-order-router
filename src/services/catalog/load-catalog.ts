import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Catalog } from '../../models/catalog.js';
import type { Product } from '../../models/product.js';
import { readRows } from './read-rows.js';
import { productSchema, supplierSchema } from './schemas.js';

/**
 * Load `products.csv` and `suppliers.csv` from a directory (BUS_RULE-002…007).
 * Malformed data and duplicate supplier IDs fail fast at boot; repeated product
 * codes keep the first row and warn once per skipped row (OPEN-007).
 */
export async function loadCatalog(
  directory: string,
  output: Pick<Console, 'warn'> = console,
): Promise<Catalog> {
  const [productCsv, supplierCsv] = await Promise.all([
    readFile(join(directory, 'products.csv'), 'utf8'),
    readFile(join(directory, 'suppliers.csv'), 'utf8'),
  ]);
  const products = new Map<string, Product>();
  for (const product of readRows(productCsv, 'products.csv', productSchema)) {
    if (products.has(product.code)) {
      output.warn(
        `products.csv: duplicate product code ${product.code} (category ${product.category} ignored); using first entry.`,
      );
      continue;
    }
    products.set(product.code, product);
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
