import { parse } from 'csv-parse/sync';
import type { z } from 'zod';

/** Parse a CSV into records and validate each row; normalize known assessment quirks. */
export function readRows<T>(content: string, filename: string, schema: z.ZodType<T>): T[] {
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
