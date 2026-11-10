import { describe, expect, it } from 'vitest';
import type { LineItem, Order } from '../../../src/models/order.js';
import type { RoutingDecision, Shipment } from '../../../src/models/routing-decision.js';
import type { Supplier } from '../../../src/models/supplier.js';
import { setCatalog } from '../../../src/services/catalog/catalog-store.js';
import { routeOrder } from '../../../src/services/routing/index.js';
import {
  LOCAL_ZIPS,
  REMOTE_ZIPS,
  makeCatalog,
  makeOrder,
  makeSupplier,
} from '../../helpers/catalog.js';

const PRODUCTS = { 'WC-1': 'wheelchair', 'OX-1': 'oxygen', 'CP-1': 'cpap' };

function routeWith(
  suppliers: Supplier[],
  order: Order,
  products: Record<string, string> = PRODUCTS,
): RoutingDecision {
  setCatalog(makeCatalog(products, suppliers));
  return routeOrder(order);
}

/** One line item with quantity 1 per product code. */
function lineItems(...productCodes: string[]): LineItem[] {
  return productCodes.map((productCode) => ({ productCode, quantity: 1 }));
}

function shipmentsOf(decision: RoutingDecision): Shipment[] {
  if (!decision.feasible) throw new Error(`Expected feasible: ${decision.errors.join('; ')}`);
  return decision.shipments;
}

function supplierIdsOf(decision: RoutingDecision): string[] {
  return shipmentsOf(decision).map((shipment) => shipment.supplier.id);
}

describe('routeOrder', () => {
  describe('line items', () => {
    // BR-010, BRX-006, BRX-007
    it('combines repeated line items into one total assigned to one supplier', () => {
      const decision = routeWith(
        [makeSupplier({ id: 'SUP-1', supportedCategories: new Set(['wheelchair']) })],
        makeOrder({
          lineItems: [
            { productCode: 'WC-1', quantity: 1 },
            { productCode: 'WC-1', quantity: 2 },
          ],
        }),
      );

      expect(shipmentsOf(decision)[0]?.lineItems).toEqual([
        { productCode: 'WC-1', quantity: 3, category: 'wheelchair' },
      ]);
    });

    // BR-024, BR-026, BRX-013
    it('is infeasible with one reason per unknown product code', () => {
      const decision = routeWith(
        [makeSupplier({ id: 'SUP-1', supportedCategories: new Set(['wheelchair']) })],
        makeOrder({ lineItems: lineItems('WC-1', 'NOPE-2', 'NOPE-1') }),
      );

      expect(decision).toEqual({
        feasible: false,
        errors: ['Unknown product code: NOPE-1.', 'Unknown product code: NOPE-2.'],
      });
    });

    // BRX-019
    it('is infeasible when a combined total can no longer be represented exactly', () => {
      const decision = routeWith(
        [makeSupplier({ id: 'SUP-1', supportedCategories: new Set(['wheelchair']) })],
        makeOrder({
          lineItems: [
            { productCode: 'WC-1', quantity: Number.MAX_SAFE_INTEGER },
            { productCode: 'WC-1', quantity: 1 },
          ],
        }),
      );

      expect(decision).toEqual({
        feasible: false,
        errors: ['Total quantity for WC-1 is too large.'],
      });
    });
  });

  describe('supplier eligibility', () => {
    const remoteMailSupplier = makeSupplier({
      id: 'SUP-MAIL',
      supportedCategories: new Set(['wheelchair']),
      serviceZipRanges: REMOTE_ZIPS,
      canMailOrder: true,
    });

    // BR-012, BR-015
    it('uses only suppliers serving the customer ZIP when mail order is not allowed', () => {
      const decision = routeWith(
        [remoteMailSupplier],
        makeOrder({ allowsMailOrder: false, lineItems: lineItems('WC-1') }),
      );

      expect(decision).toEqual({
        feasible: false,
        errors: [
          'No eligible supplier for WC-1 (wheelchair) at ZIP 10001 with mail order disallowed.',
        ],
      });
    });

    // BR-013, BRX-014
    it('accepts a mail-order-capable supplier regardless of ZIP when mail order is allowed', () => {
      const decision = routeWith(
        [remoteMailSupplier],
        makeOrder({ allowsMailOrder: true, lineItems: lineItems('WC-1') }),
      );

      expect(shipmentsOf(decision)).toMatchObject([
        { supplier: { id: 'SUP-MAIL' }, fulfillmentMode: 'mail_order' },
      ]);
    });

    // BR-011, BR-014
    it('still requires the product category when mail order is allowed', () => {
      const decision = routeWith(
        [remoteMailSupplier],
        makeOrder({ allowsMailOrder: true, lineItems: lineItems('OX-1') }),
      );

      expect(decision).toEqual({
        feasible: false,
        errors: ['No eligible supplier for OX-1 (oxygen) at ZIP 10001 with mail order allowed.'],
      });
    });

    // BR-015, BRX-009
    it('is infeasible as a whole when any line item cannot be fulfilled', () => {
      const decision = routeWith(
        [makeSupplier({ id: 'SUP-1', supportedCategories: new Set(['wheelchair']) })],
        makeOrder({ lineItems: lineItems('WC-1', 'OX-1') }),
      );

      expect(decision).toEqual({
        feasible: false,
        errors: ['No eligible supplier for OX-1 (oxygen) at ZIP 10001 with mail order disallowed.'],
      });
    });

    // BRX-001
    it('keeps a supplier serving the ZIP eligible without mail-order capability', () => {
      const decision = routeWith(
        [makeSupplier({ id: 'SUP-LOCAL', supportedCategories: new Set(['wheelchair']) })],
        makeOrder({ allowsMailOrder: true, lineItems: lineItems('WC-1') }),
      );

      expect(shipmentsOf(decision)).toMatchObject([
        { supplier: { id: 'SUP-LOCAL' }, fulfillmentMode: 'local' },
      ]);
    });

    // BRX-015
    it('uses local fulfillment for a supplier eligible both locally and by mail order', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-BOTH-WAYS',
            supportedCategories: new Set(['wheelchair']),
            serviceZipRanges: LOCAL_ZIPS,
            canMailOrder: true,
          }),
        ],
        makeOrder({ allowsMailOrder: true, lineItems: lineItems('WC-1') }),
      );

      expect(shipmentsOf(decision)[0]?.fulfillmentMode).toBe('local');
    });

    // BR-008
    it('matches a leading-zero customer ZIP against service ZIP coverage', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-BOSTON',
            supportedCategories: new Set(['cpap']),
            serviceZipRanges: [{ start: 2130, end: 2130 }],
          }),
        ],
        makeOrder({ customerZip: '02130', lineItems: lineItems('CP-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-BOSTON']);
    });
  });

  describe('routing priorities', () => {
    // BR-016, BR-019, BRX-002
    it('prefers one shipment over two shipments with higher satisfaction scores', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-BOTH',
            supportedCategories: new Set(['wheelchair', 'oxygen']),
            satisfactionScore: 5,
          }),
          makeSupplier({
            id: 'SUP-WC',
            supportedCategories: new Set(['wheelchair']),
            satisfactionScore: 10,
          }),
          makeSupplier({
            id: 'SUP-OX',
            supportedCategories: new Set(['oxygen']),
            satisfactionScore: 10,
          }),
        ],
        makeOrder({ lineItems: lineItems('WC-1', 'OX-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-BOTH']);
    });

    // BR-011, BR-016
    it('finds the fewest shipments even when the broadest supplier is not part of them', () => {
      const products = { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f' };
      const decision = routeWith(
        [
          makeSupplier({ id: 'BROADEST', supportedCategories: new Set(['a', 'b', 'c', 'd']) }),
          makeSupplier({ id: 'LEFT', supportedCategories: new Set(['a', 'b', 'e']) }),
          makeSupplier({ id: 'RIGHT', supportedCategories: new Set(['c', 'd', 'f']) }),
          makeSupplier({ id: 'ONLY-E', supportedCategories: new Set(['e']) }),
          makeSupplier({ id: 'ONLY-F', supportedCategories: new Set(['f']) }),
          makeSupplier({
            id: 'UNRELATED',
            supportedCategories: new Set(['zzz']),
            satisfactionScore: 10,
          }),
        ],
        makeOrder({ lineItems: lineItems('A', 'B', 'C', 'D', 'E', 'F') }),
        products,
      );

      expect(supplierIdsOf(decision)).toEqual(['LEFT', 'RIGHT']);
    });

    // BR-017
    it('prefers the higher customer satisfaction score among single-supplier plans', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-LOW',
            supportedCategories: new Set(['wheelchair']),
            satisfactionScore: 4,
          }),
          makeSupplier({
            id: 'SUP-HIGH',
            supportedCategories: new Set(['wheelchair']),
            satisfactionScore: 9,
          }),
        ],
        makeOrder({ lineItems: lineItems('WC-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-HIGH']);
    });

    // BR-017, BRX-003
    it('prefers the higher total satisfaction among equally small multi-supplier plans', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-WC-OX',
            supportedCategories: new Set(['wheelchair', 'oxygen']),
            satisfactionScore: 5,
          }),
          makeSupplier({
            id: 'SUP-CP',
            supportedCategories: new Set(['cpap']),
            satisfactionScore: 5,
          }),
          makeSupplier({
            id: 'SUP-WC-CP',
            supportedCategories: new Set(['wheelchair', 'cpap']),
            satisfactionScore: 9,
          }),
          makeSupplier({
            id: 'SUP-OX',
            supportedCategories: new Set(['oxygen']),
            satisfactionScore: 9,
          }),
        ],
        makeOrder({ lineItems: lineItems('WC-1', 'OX-1', 'CP-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-OX', 'SUP-WC-CP']);
    });

    // BRX-003
    it('compares an unrated supplier as a score of zero', () => {
      const decision = routeWith(
        [
          makeSupplier({
            id: 'SUP-A-UNRATED',
            supportedCategories: new Set(['wheelchair']),
            satisfactionScore: null,
          }),
          makeSupplier({
            id: 'SUP-B-RATED',
            supportedCategories: new Set(['wheelchair']),
            satisfactionScore: 1,
          }),
        ],
        makeOrder({ lineItems: lineItems('WC-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-B-RATED']);
    });

    describe('local versus mail-order fulfillment', () => {
      const local = makeSupplier({
        id: 'SUP-LOCAL',
        supportedCategories: new Set(['wheelchair']),
        satisfactionScore: 8,
      });
      const mailScoring = (satisfactionScore: number) =>
        makeSupplier({
          id: 'SUP-MAIL',
          supportedCategories: new Set(['wheelchair']),
          serviceZipRanges: REMOTE_ZIPS,
          canMailOrder: true,
          satisfactionScore,
        });
      const order = makeOrder({ allowsMailOrder: true, lineItems: lineItems('WC-1') });

      // BR-018, BRX-004, BRX-005
      it('prefers local fulfillment when the mail-order score is at most 0.5 higher', () => {
        expect(supplierIdsOf(routeWith([local, mailScoring(8.5)], order))).toEqual(['SUP-LOCAL']);
      });

      // BR-017, BR-019, BRX-004
      it('prefers the higher score when it is more than 0.5 higher', () => {
        const decision = routeWith([local, mailScoring(8.6)], order);

        expect(shipmentsOf(decision)).toMatchObject([
          { supplier: { id: 'SUP-MAIL' }, fulfillmentMode: 'mail_order' },
        ]);
      });
    });

    describe('similar satisfaction in multi-supplier plans', () => {
      const localSuppliers = [
        makeSupplier({
          id: 'SUP-LOCAL-WC',
          supportedCategories: new Set(['wheelchair']),
          satisfactionScore: 7,
        }),
        makeSupplier({
          id: 'SUP-LOCAL-OX',
          supportedCategories: new Set(['oxygen']),
          satisfactionScore: 7,
        }),
      ];
      const mailScoring = (satisfactionScore: number) =>
        makeSupplier({
          id: 'SUP-MAIL-WC',
          supportedCategories: new Set(['wheelchair']),
          serviceZipRanges: REMOTE_ZIPS,
          canMailOrder: true,
          satisfactionScore,
        });
      const order = makeOrder({ allowsMailOrder: true, lineItems: lineItems('WC-1', 'OX-1') });

      // BR-018, BRX-004, BRX-005
      it('compares average scores: totals 14 and 15 average 7 and 7.5, so they are similar', () => {
        const decision = routeWith([...localSuppliers, mailScoring(8)], order);

        expect(supplierIdsOf(decision)).toEqual(['SUP-LOCAL-OX', 'SUP-LOCAL-WC']);
      });

      // BR-017, BRX-004
      it('prefers the higher average when it is more than 0.5 higher', () => {
        const decision = routeWith([...localSuppliers, mailScoring(8.2)], order);

        expect(supplierIdsOf(decision)).toEqual(['SUP-LOCAL-OX', 'SUP-MAIL-WC']);
      });
    });

    // BRX-005
    it('breaks remaining ties with the smaller supplier ID', () => {
      const decision = routeWith(
        [
          makeSupplier({ id: 'SUP-B', supportedCategories: new Set(['wheelchair']) }),
          makeSupplier({ id: 'SUP-A', supportedCategories: new Set(['wheelchair']) }),
        ],
        makeOrder({ lineItems: lineItems('WC-1') }),
      );

      expect(supplierIdsOf(decision)).toEqual(['SUP-A']);
    });
  });

  describe('line-item assignment', () => {
    // BR-011, BR-020, BR-027
    it('splits the order across suppliers and accounts for every line item and quantity', () => {
      const decision = routeWith(
        [
          makeSupplier({ id: 'SUP-WC', supportedCategories: new Set(['wheelchair']) }),
          makeSupplier({ id: 'SUP-OX', supportedCategories: new Set(['oxygen']) }),
        ],
        makeOrder({
          lineItems: [
            { productCode: 'WC-1', quantity: 1 },
            { productCode: 'OX-1', quantity: 2 },
          ],
        }),
      );

      expect(shipmentsOf(decision)).toMatchObject([
        {
          supplier: { id: 'SUP-OX' },
          lineItems: [{ productCode: 'OX-1', quantity: 2, category: 'oxygen' }],
        },
        {
          supplier: { id: 'SUP-WC' },
          lineItems: [{ productCode: 'WC-1', quantity: 1, category: 'wheelchair' }],
        },
      ]);
    });

    // BRX-008
    it('assigns a line item two selected suppliers support to the smaller supplier ID', () => {
      const decision = routeWith(
        [
          makeSupplier({ id: 'SUP-B', supportedCategories: new Set(['wheelchair', 'oxygen']) }),
          makeSupplier({ id: 'SUP-A', supportedCategories: new Set(['wheelchair', 'cpap']) }),
        ],
        makeOrder({ lineItems: lineItems('WC-1', 'OX-1', 'CP-1') }),
      );

      expect(
        shipmentsOf(decision).map((shipment) => ({
          supplierId: shipment.supplier.id,
          productCodes: shipment.lineItems.map((lineItem) => lineItem.productCode),
        })),
      ).toEqual([
        { supplierId: 'SUP-A', productCodes: ['CP-1', 'WC-1'] },
        { supplierId: 'SUP-B', productCodes: ['OX-1'] },
      ]);
    });
  });
});
