import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { Catalog } from '../models/catalog.js';
import type { Supplier } from '../models/supplier.js';

const text = z.string().trim().min(1);
const category = text.toLowerCase();

const coverage = text.transform((value, context) => {
  const ranges: { start: number; end: number }[] = [];
  for (const entry of value.split(',')) {
    // Four-digit ZIPs in the supplied CSV have lost a leading zero.
    const match = /^(\d{4,5})(?:\s*-\s*(\d{4,5}))?$/.exec(entry.trim());
    const start = Number(match?.[1]);
    const end = Number(match?.[2] ?? match?.[1]);
    if (!match || start > end) {
      context.addIssue({ code: 'custom', message: `Invalid ZIP coverage: ${entry.trim()}` });
      return z.NEVER;
    }
    ranges.push({ start, end });
  }
  return ranges;
});

const rating = text.toLowerCase().pipe(
  z.union([
    z.literal('no ratings yet').transform(() => null),
    z
      .string()
      .regex(/^\d+(?:\.\d+)?$/)
      .transform(Number)
      .pipe(z.number().min(1).max(10)),
  ]),
);

const productSchema = z.object({ product_code: text, category });

const supplierSchema: z.ZodType<Supplier> = z
  .object({
    supplier_id: text,
    supplier_name: text,
    service_zips: coverage,
    product_categories: text
      .transform((value) => value.split(',').map((entry) => entry.trim().toLowerCase()))
      .pipe(z.array(category).min(1))
      .transform((categories) => new Set(categories)),
    customer_satisfaction_score: rating,
    'can_mail_order?': text
      .toLowerCase()
      .pipe(z.enum(['y', 'n']))
      .transform((value) => value === 'y'),
  })
  .transform((row) => ({
    id: row.supplier_id,
    name: row.supplier_name,
    zipRanges: row.service_zips,
    categories: row.product_categories,
    rating: row.customer_satisfaction_score,
    canMailOrder: row['can_mail_order?'],
  }));

function readRows<T>(content: string, filename: string, schema: z.ZodType<T>): T[] {
  const records: unknown = parse(content, {
    bom: true,
    trim: true,
    skip_empty_lines: true,
    columns: (headers: string[]) => {
      const names = headers.map((header) => {
        const name = header.trim();
        // The supplied supplier CSV spells this header "suplier_name".
        return name === 'suplier_name' ? 'supplier_name' : name;
      });
      if (new Set(names).size !== names.length) {
        throw new Error(`${filename}: duplicate column headers.`);
      }
      return names;
    },
  });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`${filename}: no data records.`);
  }
  return records.map((record: unknown, index) => {
    const result = schema.safeParse(record);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`${filename}, record ${index + 1}: ${details}`);
    }
    return result.data;
  });
}

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
