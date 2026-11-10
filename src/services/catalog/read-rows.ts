import { parse } from 'csv-parse/sync';
import type { z } from 'zod';
import { formatIssues } from '../../models/format-issues.js';

/** Parse a CSV into records and validate each row; normalize known assessment quirks. */
export function readRows<T>(content: string, filename: string, schema: z.ZodType<T>): T[] {
  // 1. Parse the CSV into one object per row, keyed by normalized header.
  const records: unknown = parse(content, {
    bom: true,
    trim: true,
    skip_empty_lines: true,
    columns: (headers: string[]) => normalizeHeaders(headers, filename),
  });

  // 2. An empty file is a broken catalog, not an empty one.
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`${filename}: no data records.`);
  }

  // 3. Validate every row; the first invalid row stops loading.
  return records.map((record: unknown, index) => {
    const result = schema.safeParse(record);
    if (!result.success) {
      const details = formatIssues(result.error, 'record').join('; ');
      throw new Error(`${filename}, record ${index + 1}: ${details}`);
    }
    return result.data;
  });
}

/** Trim headers, fix the known misspelling, and reject repeated column names. */
function normalizeHeaders(headers: string[], filename: string): string[] {
  const names = headers.map((header) => {
    const name = header.trim();
    // The supplied supplier CSV spells this header "suplier_name".
    return name === 'suplier_name' ? 'supplier_name' : name;
  });
  if (new Set(names).size !== names.length) {
    throw new Error(`${filename}: duplicate column headers.`);
  }
  return names;
}
