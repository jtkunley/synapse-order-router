import type { Order } from '../../models/order.js';
import type { Candidate, OrderItem } from './types.js';

/** One error per item whose category no eligible supplier covers (BUS_RULE-015). */
export function findUncoverableErrors(
  order: Order,
  items: readonly OrderItem[],
  candidates: readonly Candidate[],
): string[] {
  // Every category at least one eligible supplier can cover.
  const available = new Set(candidates.flatMap((candidate) => [...candidate.covers]));

  const mailOrder = order.mail_order ? 'allowed' : 'disallowed';
  return items
    .filter((item) => !available.has(item.category))
    .map(
      (item) =>
        `No eligible supplier for ${item.product_code} (${item.category}) at ZIP ${order.customer_zip} with mail order ${mailOrder}.`,
    );
}
