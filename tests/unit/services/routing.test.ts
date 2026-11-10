import { describe, expect, it } from 'vitest';
import { setCatalog } from '../../../src/services/catalog/catalog-store.js';
import { toOrder, type OrderRequest } from '../../../src/models/order-request.js';
import { toRoutingResponse } from '../../../src/models/routing-response.js';
import { routeOrder as routeDomainOrder } from '../../../src/services/routing/index.js';
import { makeCatalog, makeOrder, makeSupplier } from '../../helpers/catalog.js';

function routeOrder(request: OrderRequest) {
  return toRoutingResponse(routeDomainOrder(toOrder(request)));
}

describe('routeOrder', () => {
  // BUS_RULE-010, BUS_RULE-024, OPEN-006, OPEN-007
  it('combines duplicate product lines and returns unknown-product errors', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-1',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 8,
      }),
    ]);
    setCatalog(catalog);

    const unknown = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'NOPE', quantity: 1 },
        ],
      }),
    );
    expect(unknown).toEqual({
      feasible: false,
      errors: ['Unknown product code: NOPE.'],
    });

    const combined = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'WC-1', quantity: 2 },
        ],
      }),
    );
    expect(combined.feasible).toBe(true);
    if (!combined.feasible) return;
    expect(combined.routing[0]?.items).toEqual([
      {
        product_code: 'WC-1',
        quantity: 3,
        category: 'wheelchair',
        fulfillment_mode: 'local',
      },
    ]);

    const tooLarge = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: Number.MAX_SAFE_INTEGER },
          { product_code: 'WC-1', quantity: 1 },
        ],
      }),
    );
    expect(tooLarge).toEqual({
      feasible: false,
      errors: ['Total quantity for WC-1 is too large.'],
    });
  });

  // BUS_RULE-012, BUS_RULE-013, BUS_RULE-015, OPEN-008
  it('uses only local suppliers when mail_order is false', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-MAIL',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        satisfactionScore: 10,
      }),
    ]);
    setCatalog(catalog);

    expect(
      routeOrder(makeOrder({ mail_order: false, items: [{ product_code: 'WC-1', quantity: 1 }] })),
    ).toMatchObject({ feasible: false });

    const routed = routeOrder(
      makeOrder({ mail_order: true, items: [{ product_code: 'WC-1', quantity: 1 }] }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing[0]).toMatchObject({
      supplier_id: 'SUP-MAIL',
      items: [{ fulfillment_mode: 'mail_order' }],
    });
  });

  // OPEN-001, BUS_RULE-018, OPEN-008
  it('keeps local suppliers eligible when mail_order is true even without mail capability', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-LOCAL',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        canMailOrder: false,
        satisfactionScore: 6,
      }),
      makeSupplier({
        id: 'SUP-MAIL',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        satisfactionScore: 6,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({ mail_order: true, items: [{ product_code: 'WC-1', quantity: 1 }] }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing[0]?.supplier_id).toBe('SUP-LOCAL');
    expect(routed.routing[0]?.items[0]?.fulfillment_mode).toBe('local');
  });

  // BUS_RULE-016, BUS_RULE-019, OPEN-002
  it('prefers consolidation over a higher total rating with more shipments', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen' }, [
      makeSupplier({
        id: 'SUP-BOTH',
        supportedCategories: new Set(['wheelchair', 'oxygen']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 5,
      }),
      makeSupplier({
        id: 'SUP-WC',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 10,
      }),
      makeSupplier({
        id: 'SUP-OX',
        supportedCategories: new Set(['oxygen']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 10,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'OX-1', quantity: 1 },
        ],
      }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing.map((group) => group.supplier_id)).toEqual(['SUP-BOTH']);
  });

  // BUS_RULE-017
  it('prefers higher satisfaction among otherwise equal single-supplier options', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-LOW',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 4,
      }),
      makeSupplier({
        id: 'SUP-HIGH',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 9,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(makeOrder({ items: [{ product_code: 'WC-1', quantity: 1 }] }));
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing[0]?.supplier_id).toBe('SUP-HIGH');
  });

  // BUS_RULE-017, BUS_RULE-018, OPEN-004, OPEN-008
  it('prefers local fulfillment when ratings are similar, otherwise prefers quality', () => {
    const products = { 'WC-1': 'wheelchair' };
    const local = makeSupplier({
      id: 'SUP-LOCAL',
      supportedCategories: new Set(['wheelchair']),
      serviceZipRanges: [{ start: 10001, end: 10001 }],
      canMailOrder: false,
      satisfactionScore: 8,
    });
    const similarMail = makeSupplier({
      id: 'SUP-MAIL-SIMILAR',
      supportedCategories: new Set(['wheelchair']),
      serviceZipRanges: [{ start: 20000, end: 20000 }],
      canMailOrder: true,
      satisfactionScore: 8.4,
    });
    const betterMail = makeSupplier({
      id: 'SUP-MAIL-BETTER',
      supportedCategories: new Set(['wheelchair']),
      serviceZipRanges: [{ start: 20000, end: 20000 }],
      canMailOrder: true,
      satisfactionScore: 9.5,
    });

    setCatalog(makeCatalog(products, [local, similarMail]));
    const preferLocal = routeOrder(
      makeOrder({
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      }),
    );
    expect(preferLocal.feasible).toBe(true);
    if (!preferLocal.feasible) return;
    expect(preferLocal.routing[0]?.supplier_id).toBe('SUP-LOCAL');

    setCatalog(makeCatalog(products, [local, betterMail]));
    const preferQuality = routeOrder(
      makeOrder({
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      }),
    );
    expect(preferQuality.feasible).toBe(true);
    if (!preferQuality.feasible) return;
    expect(preferQuality.routing[0]?.supplier_id).toBe('SUP-MAIL-BETTER');
    expect(preferQuality.routing[0]?.items[0]?.fulfillment_mode).toBe('mail_order');
  });

  // BUS_RULE-011, BUS_RULE-015, BUS_RULE-020, BUS_RULE-027
  it('splits across suppliers when no single supplier covers every category', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen' }, [
      makeSupplier({
        id: 'SUP-WC',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 8,
      }),
      makeSupplier({
        id: 'SUP-OX',
        supportedCategories: new Set(['oxygen']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: 7,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'OX-1', quantity: 1 },
        ],
      }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing.map((group) => group.supplier_id).sort()).toEqual(['SUP-OX', 'SUP-WC']);
    expect(
      routed.routing.flatMap((group) => group.items.map((item) => item.product_code)).sort(),
    ).toEqual(['OX-1', 'WC-1']);
  });

  // BUS_RULE-017, OPEN-003
  it('prefers the higher total rating among equally small multi-supplier covers', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen', 'CP-1': 'cpap' }, [
      makeSupplier({
        id: 'SUP-WC-OX',
        supportedCategories: new Set(['wheelchair', 'oxygen']),
        satisfactionScore: 5,
      }),
      makeSupplier({ id: 'SUP-CP', supportedCategories: new Set(['cpap']), satisfactionScore: 5 }),
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
    ]);
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'OX-1', quantity: 1 },
          { product_code: 'CP-1', quantity: 1 },
        ],
      }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing.map((group) => group.supplier_id)).toEqual(['SUP-OX', 'SUP-WC-CP']);
  });

  // BUS_RULE-008
  it('matches leading-zero customer ZIPs against numeric supplier coverage', () => {
    const catalog = makeCatalog({ 'CP-1': 'cpap' }, [
      makeSupplier({
        id: 'SUP-BOS',
        supportedCategories: new Set(['cpap']),
        serviceZipRanges: [{ start: 2130, end: 2130 }],
        satisfactionScore: 8,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({
        customer_zip: '02130',
        items: [{ product_code: 'CP-1', quantity: 1 }],
      }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing[0]?.supplier_id).toBe('SUP-BOS');
  });

  // OPEN-003, OPEN-005
  it('treats unrated suppliers as score 0 and breaks equal ties by supplier id', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-B',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: null,
      }),
      makeSupplier({
        id: 'SUP-A',
        supportedCategories: new Set(['wheelchair']),
        serviceZipRanges: [{ start: 10001, end: 10001 }],
        satisfactionScore: null,
      }),
    ]);
    setCatalog(catalog);

    const routed = routeOrder(makeOrder({ items: [{ product_code: 'WC-1', quantity: 1 }] }));
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing[0]?.supplier_id).toBe('SUP-A');
  });

  // BUS_RULE-016, BUS_RULE-011
  it('improves on a suboptimal greedy cover and ignores irrelevant suppliers', () => {
    const catalog = makeCatalog(
      {
        A: 'a',
        B: 'b',
        C: 'c',
        D: 'd',
        E: 'e',
        F: 'f',
      },
      [
        makeSupplier({
          id: 'GREEDY-WIDE',
          supportedCategories: new Set(['a', 'b', 'c', 'd']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 1,
        }),
        makeSupplier({
          id: 'OPT-LEFT',
          supportedCategories: new Set(['a', 'b', 'e']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 1,
        }),
        makeSupplier({
          id: 'OPT-RIGHT',
          supportedCategories: new Set(['c', 'd', 'f']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 1,
        }),
        makeSupplier({
          id: 'SINGLE-E',
          supportedCategories: new Set(['e']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 1,
        }),
        makeSupplier({
          id: 'SINGLE-F',
          supportedCategories: new Set(['f']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 1,
        }),
        makeSupplier({
          id: 'IRRELEVANT',
          supportedCategories: new Set(['zzz']),
          serviceZipRanges: [{ start: 10001, end: 10001 }],
          satisfactionScore: 10,
        }),
      ],
    );
    setCatalog(catalog);

    const routed = routeOrder(
      makeOrder({
        items: ['A', 'B', 'C', 'D', 'E', 'F'].map((product_code) => ({
          product_code,
          quantity: 1,
        })),
      }),
    );
    expect(routed.feasible).toBe(true);
    if (!routed.feasible) return;
    expect(routed.routing.map((group) => group.supplier_id).sort()).toEqual([
      'OPT-LEFT',
      'OPT-RIGHT',
    ]);
  });

  // BUS_RULE-011, BUS_RULE-014, BUS_RULE-015, BUS_RULE-024
  it('reports infeasible mail-order failures when no supplier can cover a category', () => {
    const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-REMOTE',
        supportedCategories: new Set(['oxygen']),
        serviceZipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        satisfactionScore: 9,
      }),
    ]);
    setCatalog(catalog);

    expect(
      routeOrder(
        makeOrder({
          mail_order: true,
          items: [{ product_code: 'WC-1', quantity: 1 }],
        }),
      ),
    ).toEqual({
      feasible: false,
      errors: ['No eligible supplier for WC-1 (wheelchair) at ZIP 10001 with mail order allowed.'],
    });
  });
});
