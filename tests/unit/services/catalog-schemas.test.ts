import { describe, expect, it } from 'vitest';
import { productSchema, supplierSchema } from '../../../src/services/catalog/schemas.js';

const supplierRow = {
  supplier_id: 'SUP-1',
  supplier_name: 'One',
  service_zips: '10001',
  product_categories: 'wheelchair',
  customer_satisfaction_score: '5',
  'can_mail_order?': 'y',
};

function parseSupplier(overrides: Partial<typeof supplierRow>) {
  return supplierSchema.safeParse({ ...supplierRow, ...overrides });
}

describe('supplierSchema', () => {
  // BR-004
  it('reads individual service ZIPs and ZIP ranges', () => {
    expect(parseSupplier({ service_zips: '10001, 10005-10010' }).data?.serviceZipRanges).toEqual([
      { start: 10001, end: 10001 },
      { start: 10005, end: 10010 },
    ]);
  });

  // BR-004
  it('rejects a reversed ZIP range', () => {
    expect(parseSupplier({ service_zips: '10010-10005' }).success).toBe(false);
  });

  // BR-008, BRX-018
  it('reads a four-digit service ZIP as the same ZIP with its leading zero restored', () => {
    const fourDigit = parseSupplier({ service_zips: '2134' }).data?.serviceZipRanges;
    const fiveDigit = parseSupplier({ service_zips: '02134' }).data?.serviceZipRanges;

    expect(fourDigit).toEqual(fiveDigit);
  });

  // BR-005
  it('reads several supported product categories', () => {
    expect(
      parseSupplier({ product_categories: 'wheelchair, oxygen' }).data?.supportedCategories,
    ).toEqual(new Set(['wheelchair', 'oxygen']));
  });

  // BR-006
  it.each([
    ['1', 1],
    ['7.5', 7.5],
    ['10', 10],
    ['no ratings yet', null],
  ])('accepts customer satisfaction score %j', (score, expected) => {
    expect(parseSupplier({ customer_satisfaction_score: score }).data?.satisfactionScore).toBe(
      expected,
    );
  });

  // BR-006
  it.each(['0', '10.5', '-1', 'unknown'])('rejects customer satisfaction score %j', (score) => {
    expect(parseSupplier({ customer_satisfaction_score: score }).success).toBe(false);
  });

  // BR-007
  it.each([
    ['y', true],
    ['n', false],
  ])('reads mail-order capability %j', (value, expected) => {
    expect(parseSupplier({ 'can_mail_order?': value }).data?.canMailOrder).toBe(expected);
  });

  // BR-007
  it('rejects mail-order capability other than y or n', () => {
    expect(parseSupplier({ 'can_mail_order?': 'yes' }).success).toBe(false);
  });

  // BRX-016
  it('ignores surrounding whitespace and the letter case of categories, ratings text, and y/n', () => {
    const parsed = parseSupplier({
      supplier_id: ' SUP-1 ',
      supplier_name: ' One ',
      service_zips: ' 10001 , 10002 ',
      product_categories: ' Wheelchair , OXYGEN ',
      customer_satisfaction_score: ' No Ratings Yet ',
      'can_mail_order?': ' Y ',
    });

    expect(parsed.data).toEqual({
      id: 'SUP-1',
      name: 'One',
      serviceZipRanges: [
        { start: 10001, end: 10001 },
        { start: 10002, end: 10002 },
      ],
      supportedCategories: new Set(['wheelchair', 'oxygen']),
      satisfactionScore: null,
      canMailOrder: true,
    });
  });
});

describe('productSchema', () => {
  // BR-002, BRX-016
  it('maps a product code to its product category, ignoring whitespace and category case', () => {
    expect(productSchema.parse({ product_code: ' WC-1 ', category: ' Wheelchair ' })).toEqual({
      code: 'WC-1',
      category: 'wheelchair',
    });
  });
});
