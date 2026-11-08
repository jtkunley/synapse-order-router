import { bitCount } from './bit-count.js';
import { compareText } from './compare-text.js';
import { planIds } from './plan-ids.js';
import { EPSILON, SIMILAR_RATING_DIFFERENCE, type Candidate, type Plan } from './types.js';

export function selectSuppliers(
  candidates: Candidate[],
  fullMask: bigint,
  bits: bigint[],
): Candidate[] {
  const byCategory = bits
    .map((bit) => ({
      bit,
      options: candidates.filter((candidate) => (candidate.mask & bit) !== 0n),
    }))
    .sort((left, right) => left.options.length - right.options.length);

  // A greedy cover supplies an upper bound only; the search below is exact.
  let greedyMask = 0n;
  let minimumCount = 0;
  while (greedyMask !== fullMask) {
    let best = candidates[0]!;
    for (const candidate of candidates) {
      if (bitCount(candidate.mask & ~greedyMask) > bitCount(best.mask & ~greedyMask)) {
        best = candidate;
      }
    }
    greedyMask |= best.mask;
    minimumCount++;
  }

  const maximumCoverage = Math.max(...candidates.map((candidate) => candidate.coverageCount));
  const bestByMailCount = new Map<number, Plan>();
  const visited = new Map<string, { score: number; ids: string }>();

  function search(mask: bigint, chosen: Candidate[], score: number, mailCount: number): void {
    if (mask === fullMask) {
      if (chosen.length < minimumCount) {
        minimumCount = chosen.length;
        bestByMailCount.clear();
      }
      if (chosen.length !== minimumCount) return;
      const ids = planIds(chosen);
      const previous = bestByMailCount.get(mailCount);
      if (
        !previous ||
        score > previous.score + EPSILON ||
        (Math.abs(score - previous.score) <= EPSILON && compareText(ids, previous.ids) < 0)
      ) {
        bestByMailCount.set(mailCount, { candidates: [...chosen], score, mailCount, ids });
      }
      return;
    }
    const remaining = fullMask & ~mask;
    if (chosen.length + Math.ceil(bitCount(remaining) / maximumCoverage) > minimumCount) return;

    // With identical coverage/count/mode, future options are identical: a chosen
    // supplier cannot cover an uncovered category. Retain the best quality prefix.
    const key = `${mask}:${chosen.length}:${mailCount}`;
    const ids = planIds(chosen);
    const previous = visited.get(key);
    if (
      previous &&
      (previous.score > score + EPSILON ||
        (Math.abs(previous.score - score) <= EPSILON && compareText(previous.ids, ids) <= 0))
    ) {
      return;
    }
    visited.set(key, { score, ids });

    const category = byCategory.find(({ bit }) => (remaining & bit) !== 0n)!;
    for (const candidate of category.options) {
      chosen.push(candidate);
      search(
        mask | candidate.mask,
        chosen,
        score + candidate.score,
        mailCount + Number(!candidate.local),
      );
      chosen.pop();
    }
  }

  search(0n, [], 0, 0);
  const plans = [...bestByMailCount.values()];
  const highestScore = Math.max(...plans.map((plan) => plan.score));
  const similarPlans = plans.filter(
    (plan) => highestScore - plan.score <= SIMILAR_RATING_DIFFERENCE * minimumCount + EPSILON,
  );
  similarPlans.sort(
    (left, right) =>
      left.mailCount - right.mailCount ||
      right.score - left.score ||
      compareText(left.ids, right.ids),
  );
  return similarPlans[0]!.candidates.sort((left, right) =>
    compareText(left.supplier.id, right.supplier.id),
  );
}
