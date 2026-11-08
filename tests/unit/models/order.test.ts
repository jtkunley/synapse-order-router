import { describe, expect, it } from 'vitest';
import { orderSchema } from '../../../src/models/order.js';

describe('orderSchema', () => {
  it('accepts a valid order and strips unused sample fields', () => {
    const parsed = orderSchema.parse({
      order_id: ' ORD-1 ',
      customer_zip: '02130',
      mail_order: true,
      items: [{ product_code: ' WC-1 ', quantity: 2 }],
      priority: 'rush',
      notes: 'ignored',
    });

    expect(parsed).toEqual({
      order_id: 'ORD-1',
      customer_zip: '02130',
      mail_order: true,
      items: [{ product_code: 'WC-1', quantity: 2 }],
    });
  });

  it('reports multiple validation errors together', () => {
    const result = orderSchema.safeParse({
      order_id: '',
      customer_zip: '213',
      mail_order: 'yes',
      items: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((issue) => issue.path.join('.') || 'order');
    expect(paths).toEqual(
      expect.arrayContaining(['order_id', 'customer_zip', 'mail_order', 'items']),
    );
  });

  it('requires at least one line item and a five-digit ZIP', () => {
    expect(
      orderSchema.safeParse({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [],
      }).success,
    ).toBe(false);

    expect(
      orderSchema.safeParse({
        order_id: 'ORD-1',
        customer_zip: '1000',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      }).success,
    ).toBe(false);
  });
});
