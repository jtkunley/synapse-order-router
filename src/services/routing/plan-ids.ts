import { compareText } from './compare-text.js';
import type { EligibleSupplier } from './types.js';

/** Order-independent key for a set of suppliers, used for deterministic tie-breaks (BRX-005). */
export function planIds(eligibleSuppliers: readonly EligibleSupplier[]): string {
  return eligibleSuppliers
    .map((eligible) => eligible.supplier.id)
    .sort(compareText)
    .join('\0');
}
