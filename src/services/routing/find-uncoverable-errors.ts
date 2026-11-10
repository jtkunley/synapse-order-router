import type { Order } from '../../models/order.js';
import type { Candidate, OrderItem } from './types.js';

/** One error per item whose category no eligible supplier covers (BUS_RULE-015). */
export function findUncoverableErrors(
  order: Order,
  items: readonly OrderItem[],
  candidates: readonly Candidate[],
  categoryBits: ReadonlyMap<string, bigint>,
): string[] {
  // Every category at least one eligible supplier can cover.
  const availableMask = candidates.reduce((mask, candidate) => mask | candidate.mask, 0n);

  const mailOrder = order.mail_order ? 'allowed' : 'disallowed';
  return items
    .filter((item) => (availableMask & categoryBits.get(item.category)!) === 0n)
    .map(
      (item) =>
        `No eligible supplier for ${item.product_code} (${item.category}) at ZIP ${order.customer_zip} with mail order ${mailOrder}.`,
    );
}
