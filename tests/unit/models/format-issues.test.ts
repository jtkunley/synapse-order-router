import { describe, expect, it } from 'vitest';
import { formatIssues } from '../../../src/models/format-issues';
import { orderRequestSchema } from '../../../src/models/order-request';

function errorsFor(body: unknown): string[] {
  const result = orderRequestSchema.safeParse(body);
  if (result.success) throw new Error('Expected validation to fail.');
  return formatIssues(result.error, 'order');
}

describe('formatIssues', () => {
  // BR-024
  it('names each invalid field by its path', () => {
    const errors = errorsFor({
      order_id: 'ORD-1',
      customer_zip: '10001',
      mail_order: false,
      items: [{ product_code: 'WC-1', quantity: 0 }],
    });

    expect(errors).toEqual([expect.stringMatching(/^items\.0\.quantity: /)]);
  });

  // BR-024
  it('names the whole order when the body is not an order object', () => {
    expect(errorsFor([])).toEqual([expect.stringMatching(/^order: /)]);
  });
});
