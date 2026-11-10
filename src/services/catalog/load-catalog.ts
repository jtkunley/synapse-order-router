import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Catalog } from '../../models/catalog.js';
import type { Product } from '../../models/product.js';
import type { Supplier } from '../../models/supplier.js';
import { readRows } from './read-rows.js';
import { productSchema, supplierSchema } from './schemas.js';

/**
 * Load `products.csv` and `suppliers.csv` from a directory (BUS_RULE-002…007).
 * Missing or malformed data rejects; repeated product codes and supplier IDs keep
 * the first row and warn once per skipped row (OPEN-007).
 */
export async function loadCatalog(directory: string): Promise<Catalog> {
  const [productCsv, supplierCsv] = await Promise.all([
    readFile(join(directory, 'products.csv'), 'utf8'),
    readFile(join(directory, 'suppliers.csv'), 'utf8'),
  ]);
  return {
    products: loadProducts(productCsv),
    suppliers: loadSuppliers(supplierCsv),
  };
}

/** Keyed by code: routing resolves each order line's category with a direct lookup. */
function loadProducts(csv: string): Map<string, Product> {
  const products = new Map<string, Product>();
  for (const product of readRows(csv, 'products.csv', productSchema)) {
    if (products.has(product.code)) {
      console.warn(
        `products.csv: duplicate product code ${product.code} (category ${product.category} ignored); using first entry.`,
      );
      continue;
    }
    products.set(product.code, product);
  }
  return products;
}

/**
 * A list, not a map: routing scans every supplier for eligibility and never looks
 * one up by ID. The ID set exists only to detect duplicate rows while loading.
 */
function loadSuppliers(csv: string): Supplier[] {
  const suppliers: Supplier[] = [];
  const supplierIds = new Set<string>();
  for (const supplier of readRows(csv, 'suppliers.csv', supplierSchema)) {
    if (supplierIds.has(supplier.id)) {
      console.warn(
        `suppliers.csv: duplicate supplier ID ${supplier.id} (name ${supplier.name} ignored); using first entry.`,
      );
      continue;
    }
    supplierIds.add(supplier.id);
    suppliers.push(supplier);
  }
  return suppliers;
}
