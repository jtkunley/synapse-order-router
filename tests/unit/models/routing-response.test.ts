import { describe, expect, it } from 'vitest';
import {
  failureSchema,
  responseSchema,
  toRoutingResponse,
} from '../../../src/models/routing-response.js';
import { makeSupplier } from '../../helpers/catalog.js';

describe('responseSchema', () => {
  // BR-023
  it('accepts a feasible routing response', () => {
    const parsed = responseSchema.parse({
      feasible: true,
      routing: [
        {
          supplier_id: 'SUP-1',
          supplier_name: 'Supplier',
          items: [
            {
              product_code: 'WC-1',
              quantity: 1,
              category: 'wheelchair',
              fulfillment_mode: 'local',
            },
          ],
        },
      ],
    });
    expect(parsed.feasible).toBe(true);
  });

  // BR-024
  it('accepts an infeasible response', () => {
    expect(failureSchema.parse({ feasible: false, errors: ['bad'] })).toEqual({
      feasible: false,
      errors: ['bad'],
    });
  });

  // BR-023, BR-024, BRX-002
  it('rejects a supplier group without line items and an empty error list', () => {
    expect(
      responseSchema.safeParse({
        feasible: true,
        routing: [{ supplier_id: 'SUP-1', supplier_name: 'S', items: [] }],
      }).success,
    ).toBe(false);

    expect(failureSchema.safeParse({ feasible: false, errors: [] }).success).toBe(false);
  });
});

describe('toRoutingResponse', () => {
  // BR-023, BRX-014
  it('translates shipments into supplier groups with each line item’s fulfillment mode', () => {
    const supplier = makeSupplier({
      id: 'SUP-1',
      name: 'Supplier',
      supportedCategories: new Set(['wheelchair']),
    });

    expect(
      toRoutingResponse({
        feasible: true,
        shipments: [
          {
            supplier,
            fulfillmentMode: 'mail_order',
            lineItems: [{ productCode: 'WC-1', quantity: 2, category: 'wheelchair' }],
          },
        ],
      }),
    ).toEqual({
      feasible: true,
      routing: [
        {
          supplier_id: 'SUP-1',
          supplier_name: 'Supplier',
          items: [
            {
              product_code: 'WC-1',
              quantity: 2,
              category: 'wheelchair',
              fulfillment_mode: 'mail_order',
            },
          ],
        },
      ],
    });
  });

  // BR-024
  it('translates an infeasible decision into its errors', () => {
    expect(toRoutingResponse({ feasible: false, errors: ['Unknown product code: NOPE.'] })).toEqual(
      {
        feasible: false,
        errors: ['Unknown product code: NOPE.'],
      },
    );
  });
});
