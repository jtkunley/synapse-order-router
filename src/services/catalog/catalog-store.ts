import type { Catalog } from '../../models/catalog.js';

let current: Catalog | undefined;

/** The catalog loaded at startup; throws if `loadCatalog` has not completed. */
export function getCatalog(): Catalog {
  if (current === undefined) throw new Error('Catalog has not been loaded.');
  return current;
}

export function setCatalog(catalog: Catalog): void {
  current = catalog;
}
