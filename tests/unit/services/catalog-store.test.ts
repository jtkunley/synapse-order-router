import { describe, expect, it } from 'vitest';
import { getCatalog, setCatalog } from '../../../src/services/catalog/catalog-store';
import { makeCatalog } from '../../helpers/catalog';

describe('catalog store', () => {
  it('throws before a catalog is loaded, then returns the stored catalog', () => {
    expect(() => getCatalog()).toThrow(/Catalog has not been loaded/);

    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, []);
    setCatalog(catalog);
    expect(getCatalog()).toBe(catalog);
  });
});
