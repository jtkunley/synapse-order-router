import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Catalog } from '../../models/catalog.js';
import type { Product } from '../../models/product.js';
import type { Supplier } from '../../models/supplier.js';
import { readRows } from './read-rows.js';
import { productSchema, supplierSchema } from './schemas.js';

/**
 * Load `products.csv` and `suppliers.csv` from a directory (BUS_RULE-002…007).
 * Malformed data fails fast at boot; repeated product codes and supplier IDs keep
 * the first row and warn once per skipped row (OPEN-007).
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
  const suppliers: Supplier[] = [];
  const supplierIds = new Set<string>();
  for (const supplier of readRows(supplierCsv, 'suppliers.csv', supplierSchema)) {
    if (supplierIds.has(supplier.id)) {
      output.warn(
        `suppliers.csv: duplicate supplier ID ${supplier.id} (name ${supplier.name} ignored); using first entry.`,
      );
      continue;
    }
    supplierIds.add(supplier.id);
    suppliers.push(supplier);
  }
  return { products, suppliers };
}
