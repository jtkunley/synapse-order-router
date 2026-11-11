import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getCatalog, loadCatalog } from '../../../src/services/catalog/index';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('loadCatalog', () => {
  // BR-002, BR-003, BR-004, BR-005, BR-006, BR-007, BR-008, BRX-016, BRX-017
  it('loads products and suppliers, with trimmed headers and the misspelled suplier_name header', async () => {
    await loadCatalog(join(fixtures, 'catalog-basic'));
    const catalog = getCatalog();

    expect(catalog.products.get('WC-1')).toEqual({ code: 'WC-1', category: 'wheelchair' });
    expect(catalog.products.get('OX-1')).toEqual({ code: 'OX-1', category: 'oxygen' });
    expect(catalog.suppliers).toHaveLength(3);

    const local = catalog.suppliers.find((supplier) => supplier.id === 'SUP-LOCAL');
    expect(local).toMatchObject({
      name: 'Local Only',
      satisfactionScore: 8,
      canMailOrder: false,
      serviceZipRanges: [
        { start: 10001, end: 10001 },
        { start: 2130, end: 2130 },
      ],
    });
    expect(local?.supportedCategories).toEqual(new Set(['wheelchair', 'oxygen']));

    const mail = catalog.suppliers.find((supplier) => supplier.id === 'SUP-MAIL');
    expect(mail).toMatchObject({
      satisfactionScore: 7,
      canMailOrder: true,
      serviceZipRanges: [{ start: 100, end: 99999 }],
    });

    const range = catalog.suppliers.find((supplier) => supplier.id === 'SUP-RANGE');
    expect(range).toMatchObject({
      satisfactionScore: null,
      canMailOrder: false,
      serviceZipRanges: [{ start: 2100, end: 2140 }],
    });
  });

  // BRX-012
  it('keeps the first supplier row when supplier IDs repeat', async () => {
    await loadCatalog(join(fixtures, 'catalog-duplicate-supplier'));
    const catalog = getCatalog();

    expect(catalog.suppliers).toHaveLength(1);
    expect(catalog.suppliers[0]).toMatchObject({ id: 'SUP-1', name: 'One', satisfactionScore: 5 });
  });

  // BRX-012
  it('keeps the first product row when product codes repeat', async () => {
    await loadCatalog(join(fixtures, 'catalog-duplicate-product'));
    const catalog = getCatalog();

    expect(catalog.products.size).toBe(1);
    expect(catalog.products.get('WC-1')).toEqual({ code: 'WC-1', category: 'wheelchair' });
  });

  // BRX-011
  it('rejects an empty CSV file as a malformed catalog', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-empty'))).rejects.toThrow(/no data records/);
  });

  // BR-004, BRX-011
  it('rejects a malformed record, such as a reversed ZIP range', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-bad-zip'))).rejects.toThrow(
      /Invalid ZIP coverage/,
    );
  });

  // BRX-011
  it('rejects duplicate column headers as a malformed catalog', async () => {
    await expect(loadCatalog(join(fixtures, 'catalog-duplicate-header'))).rejects.toThrow(
      /duplicate column headers/,
    );
  });
});
