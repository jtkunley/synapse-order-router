import { compareText } from './compare-text.js';
import type { Candidate } from './types.js';

export function planIds(candidates: readonly Candidate[]): string {
  return candidates
    .map((candidate) => candidate.supplier.id)
    .sort(compareText)
    .join('\0');
}
