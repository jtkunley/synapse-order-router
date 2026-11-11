import type { EligibleSupplier } from '../../models/eligible-supplier';
import { compareText } from './compare-text';

/** Supplier IDs in order, joined: the last routing-plan tie-break (BRX-005). */
export function getTieBreakKey(suppliers: readonly EligibleSupplier[]): string {
  return suppliers
    .map((eligible) => eligible.supplier.id)
    .sort(compareText)
    .join('\0');
}
