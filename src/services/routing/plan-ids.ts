import { compareText } from './compare-text.js';
import type { Candidate } from './types.js';

/** Order-independent key for a set of suppliers, used for deterministic tie-breaks (OPEN-005). */
export function planIds(candidates: readonly Candidate[]): string {
  return candidates
    .map((candidate) => candidate.supplier.id)
    .sort(compareText)
    .join('\0');
}
