import { describe, expect, it } from 'vitest';
import {
  failureSchema,
  getFailureResponse,
  getSuccessResponse,
  responseSchema,
} from '../../../src/models/routing-response';
import { makeSupplier } from '../../helpers/catalog';

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

describe('getSuccessResponse', () => {
  // BR-023, BRX-014
  it('builds supplier groups from shipments with each line item’s fulfillment mode', () => {
    const supplier = makeSupplier({
      id: 'SUP-1',
      name: 'Supplier',
      supportedCategories: new Set(['wheelchair']),
    });

    expect(
      getSuccessResponse([
        {
          supplier,
          fulfillmentMode: 'mail_order',
          lineItems: [{ productCode: 'WC-1', quantity: 2, category: 'wheelchair' }],
        },
      ]),
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
});

describe('getFailureResponse', () => {
  // BR-024
  it('builds an infeasible response from its errors', () => {
    expect(getFailureResponse(['Unknown product code: NOPE.'])).toEqual({
      feasible: false,
      errors: ['Unknown product code: NOPE.'],
    });
  });
});
