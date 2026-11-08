import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../../../src/services/catalog/index.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('loadCatalog', () => {
  // BUS_RULE-002, BUS_RULE-003, BUS_RULE-004, BUS_RULE-005, BUS_RULE-006, BUS_RULE-007, BUS_RULE-008
  it('parses ZIP lists, ranges, ratings, and the misspelled supplier_name header', async () => {
    const catalog = await loadCatalog(join(fixtures, 'catalog-basic'));

    expect(catalog.products.get('WC-1')).toBe('wheelchair');
    expect(catalog.products.get('OX-1')).toBe('oxygen');
    expect(catalog.suppliers).toHaveLength(3);

    const local = catalog.suppliers.find((supplier) => supplier.id === 'SUP-LOCAL');
    expect(local).toMatchObject({
      name: 'Local Only',
      rating: 8,
      canMailOrder: false,
      zipRanges: [
        { start: 10001, end: 10001 },
        { start: 2130, end: 2130 },
      ],
    });
    expect(local?.categories).toEqual(new Set(['wheelchair', 'oxygen']));

    const mail = catalog.suppliers.find((supplier) => supplier.id === 'SUP-MAIL');
    expect(mail).toMatchObject({
      rating: 7,
      canMailOrder: true,
      zipRanges: [{ start: 100, end: 99999 }],
    });

    const range = catalog.suppliers.find((supplier) => supplier.id === 'SUP-RANGE');
    expect(range).toMatchObject({
      rating: null,
      canMailOrder: false,
      zipRanges: [{ start: 2100, end: 2140 }],
    });
  });

  // OPEN-007
  it('rejects duplicate supplier IDs', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-duplicate-supplier'))).rejects.toThrow(
      /duplicate supplier ID SUP-1/,
    );
  });

  // OPEN-007
  it('rejects conflicting product categories', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-conflict-product'))).rejects.toThrow(
      /conflicting categories for WC-1/,
    );
  });

  // OPEN-007
  it('rejects empty CSV files', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-empty'))).rejects.toThrow(/no data records/);
  });

  // BUS_RULE-004, OPEN-007
  it('rejects inverted ZIP ranges with a record-level error', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-bad-zip'))).rejects.toThrow(
      /Invalid ZIP coverage/,
    );
  });

  // OPEN-007
  it('rejects duplicate column headers', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-duplicate-header'))).rejects.toThrow(
      /duplicate column headers/,
    );
  });
});
