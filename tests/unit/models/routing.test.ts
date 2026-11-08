import { describe, expect, it } from 'vitest';
import { failureSchema, responseSchema } from '../../../src/models/routing.js';

describe('responseSchema', () => {
  // BUS_RULE-023
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

  // BUS_RULE-024
  it('accepts a failure response', () => {
    expect(failureSchema.parse({ feasible: false, errors: ['bad'] })).toEqual({
      feasible: false,
      errors: ['bad'],
    });
  });

  // BUS_RULE-023, BUS_RULE-024
  it('rejects empty routing groups and empty error lists', () => {
    expect(
      responseSchema.safeParse({
        feasible: true,
        routing: [{ supplier_id: 'SUP-1', supplier_name: 'S', items: [] }],
      }).success,
    ).toBe(false);

    expect(failureSchema.safeParse({ feasible: false, errors: [] }).success).toBe(false);
  });
});
