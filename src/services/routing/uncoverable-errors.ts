import type { Order } from '../../models/order.js';
import type { Candidate, OrderItem } from './types.js';

/** If any ordered category has no eligible supplier, the order is infeasible (BUS_RULE-015). */
export function uncoverableErrors(
  order: Order,
  items: readonly OrderItem[],
  candidates: readonly Candidate[],
  categoryBits: ReadonlyMap<string, bigint>,
  fullMask: bigint,
): string[] | undefined {
  const availableMask = candidates.reduce((mask, candidate) => mask | candidate.mask, 0n);
  if (availableMask === fullMask) return undefined;

  return items
    .filter((item) => (availableMask & categoryBits.get(item.category)!) === 0n)
    .map(
      (item) =>
        `No eligible supplier for ${item.product_code} (${item.category}) at ZIP ${order.customer_zip} with mail order ${order.mail_order ? 'allowed' : 'disallowed'}.`,
    );
}
