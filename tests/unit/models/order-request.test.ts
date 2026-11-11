import { describe, expect, it } from 'vitest';
import { orderRequestSchema, toOrder } from '../../../src/models/order-request';

const validRequest = {
  order_id: 'ORD-1',
  customer_zip: '10001',
  mail_order: false,
  items: [{ product_code: 'WC-1', quantity: 1 }],
};

function isValid(overrides: Record<string, unknown>): boolean {
  return orderRequestSchema.safeParse({ ...validRequest, ...overrides }).success;
}

describe('orderRequestSchema', () => {
  // BR-001, BR-008, BR-009, BRX-016
  it('accepts a valid order, trims text fields, and drops fields outside the rules', () => {
    const parsed = orderRequestSchema.parse({
      order_id: ' ORD-1 ',
      customer_zip: ' 02130 ',
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

  // BR-024, BR-025, BR-026, BRX-010
  it('reports multiple validation errors together', () => {
    const result = orderRequestSchema.safeParse({
      order_id: '',
      customer_zip: '213',
      mail_order: 'yes',
      items: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining(['order_id', 'customer_zip', 'mail_order', 'items']),
    );
  });

  // BR-025
  it('requires at least one line item and a valid customer ZIP', () => {
    expect(isValid({ items: [] })).toBe(false);
    expect(isValid({ customer_zip: '1000' })).toBe(false);
  });

  // BRX-010
  it.each([
    ['an empty order ID', { order_id: ' ' }],
    ['a ZIP with letters', { customer_zip: '1000A' }],
    ['a six-digit ZIP', { customer_zip: '100011' }],
    ['a non-Boolean mail-order value', { mail_order: 'true' }],
    ['an empty product code', { items: [{ product_code: '', quantity: 1 }] }],
    ['a zero quantity', { items: [{ product_code: 'WC-1', quantity: 0 }] }],
    ['a fractional quantity', { items: [{ product_code: 'WC-1', quantity: 1.5 }] }],
  ])('rejects %s', (_case, overrides) => {
    expect(isValid(overrides)).toBe(false);
  });

  // BRX-019
  it('rejects a quantity the service cannot represent exactly', () => {
    expect(isValid({ items: [{ product_code: 'WC-1', quantity: Number.MAX_SAFE_INTEGER }] })).toBe(
      true,
    );
    expect(
      isValid({ items: [{ product_code: 'WC-1', quantity: Number.MAX_SAFE_INTEGER + 1 }] }),
    ).toBe(false);
  });
});

describe('toOrder', () => {
  // BR-001
  it('translates the request into the domain order', () => {
    expect(
      toOrder({
        order_id: 'ORD-1',
        customer_zip: '02130',
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 2 }],
      }),
    ).toEqual({
      id: 'ORD-1',
      customerZip: '02130',
      allowsMailOrder: true,
      lineItems: [{ productCode: 'WC-1', quantity: 2 }],
    });
  });
});
