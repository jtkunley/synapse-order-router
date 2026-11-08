import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { routePath } from '../../../src/controllers/route.js';
import { loadCatalog } from '../../../src/services/catalog/index.js';
import { makeCatalog, makeSupplier } from '../../helpers/catalog.js';

function appWithCatalog(
  products: Record<string, string>,
  suppliers: Parameters<typeof makeCatalog>[1],
) {
  return createApp(makeCatalog(products, suppliers));
}

describe('POST /api/route', () => {
  it('returns HTTP 200 with the success routing shape', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-1',
        name: 'Local Supply',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 8,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 2 }],
        priority: 'rush',
        notes: 'ignored by routing',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feasible: true,
      routing: [
        {
          supplier_id: 'SUP-1',
          supplier_name: 'Local Supply',
          items: [
            {
              product_code: 'WC-1',
              quantity: 2,
              category: 'wheelchair',
              fulfillment_mode: 'local',
            },
          ],
        },
      ],
    });
  });

  it('returns HTTP 200 with multiple validation errors for invalid orders', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-1',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
      }),
    ]);

    const response = await request(app).post(routePath).send({
      order_id: '',
      customer_zip: '213',
      mail_order: false,
      items: [],
    });

    expect(response.status).toBe(200);
    expect(response.body.feasible).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(1);
  });

  it('returns HTTP 200 when products are unknown or the order is infeasible', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-REMOTE',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        rating: 10,
      }),
    ]);

    const unknown = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'NOPE', quantity: 1 }],
      });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({
      feasible: false,
      errors: ['Unknown product code: NOPE.'],
    });

    const infeasible = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(infeasible.status).toBe(200);
    expect(infeasible.body.feasible).toBe(false);
    expect(infeasible.body.errors[0]).toMatch(/mail order disallowed/);
  });

  it('uses only ZIP-local suppliers when mail_order is false', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-MAIL',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        rating: 10,
      }),
      makeSupplier({
        id: 'SUP-LOCAL',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        canMailOrder: false,
        rating: 5,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.routing).toHaveLength(1);
    expect(response.body.routing[0].supplier_id).toBe('SUP-LOCAL');
    expect(response.body.routing[0].items[0].fulfillment_mode).toBe('local');
  });

  it('allows mail-capable suppliers regardless of ZIP when mail_order is true, but still requires category', async () => {
    const mailWheelchairOnly = appWithCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen' }, [
      makeSupplier({
        id: 'SUP-MAIL-WC',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        rating: 8,
      }),
    ]);

    const routed = await request(mailWheelchairOnly)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(routed.status).toBe(200);
    expect(routed.body.feasible).toBe(true);
    expect(routed.body.routing[0]).toMatchObject({
      supplier_id: 'SUP-MAIL-WC',
      items: [{ fulfillment_mode: 'mail_order', category: 'wheelchair' }],
    });

    const wrongCategory = await request(mailWheelchairOnly)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: true,
        items: [{ product_code: 'OX-1', quantity: 1 }],
      });
    expect(wrongCategory.status).toBe(200);
    expect(wrongCategory.body.feasible).toBe(false);
    expect(wrongCategory.body.errors[0]).toMatch(/No eligible supplier for OX-1/);
  });

  it('keeps local non-mail suppliers eligible when mail_order is true', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-LOCAL',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        canMailOrder: false,
        rating: 6,
      }),
      makeSupplier({
        id: 'SUP-MAIL',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 20000, end: 20000 }],
        canMailOrder: true,
        rating: 6,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.routing[0].supplier_id).toBe('SUP-LOCAL');
    expect(response.body.routing[0].items[0].fulfillment_mode).toBe('local');
  });

  it('prefers consolidation over a higher total rating with more shipments', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen' }, [
      makeSupplier({
        id: 'SUP-BOTH',
        categories: new Set(['wheelchair', 'oxygen']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 5,
      }),
      makeSupplier({
        id: 'SUP-WC',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 10,
      }),
      makeSupplier({
        id: 'SUP-OX',
        categories: new Set(['oxygen']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 10,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'OX-1', quantity: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expect(
      response.body.routing.map((group: { supplier_id: string }) => group.supplier_id),
    ).toEqual(['SUP-BOTH']);
  });

  it('prefers higher satisfaction among single-supplier options', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair' }, [
      makeSupplier({
        id: 'SUP-LOW',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 4,
      }),
      makeSupplier({
        id: 'SUP-HIGH',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 9,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.routing[0].supplier_id).toBe('SUP-HIGH');
  });

  it('prefers local fulfillment when ratings are similar, otherwise quality', async () => {
    const products = { 'WC-1': 'wheelchair' };
    const local = makeSupplier({
      id: 'SUP-LOCAL',
      categories: new Set(['wheelchair']),
      zipRanges: [{ start: 10001, end: 10001 }],
      canMailOrder: false,
      rating: 8,
    });

    const similar = await request(
      appWithCatalog(products, [
        local,
        makeSupplier({
          id: 'SUP-MAIL-SIMILAR',
          categories: new Set(['wheelchair']),
          zipRanges: [{ start: 20000, end: 20000 }],
          canMailOrder: true,
          rating: 8.4,
        }),
      ]),
    )
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(similar.status).toBe(200);
    expect(similar.body.routing[0].supplier_id).toBe('SUP-LOCAL');

    const quality = await request(
      appWithCatalog(products, [
        local,
        makeSupplier({
          id: 'SUP-MAIL-BETTER',
          categories: new Set(['wheelchair']),
          zipRanges: [{ start: 20000, end: 20000 }],
          canMailOrder: true,
          rating: 9.5,
        }),
      ]),
    )
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: true,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(quality.status).toBe(200);
    expect(quality.body.routing[0].supplier_id).toBe('SUP-MAIL-BETTER');
    expect(quality.body.routing[0].items[0].fulfillment_mode).toBe('mail_order');
  });

  it('splits across suppliers when no single supplier covers every category', async () => {
    const app = appWithCatalog({ 'WC-1': 'wheelchair', 'OX-1': 'oxygen' }, [
      makeSupplier({
        id: 'SUP-WC',
        categories: new Set(['wheelchair']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 8,
      }),
      makeSupplier({
        id: 'SUP-OX',
        categories: new Set(['oxygen']),
        zipRanges: [{ start: 10001, end: 10001 }],
        rating: 7,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [
          { product_code: 'WC-1', quantity: 1 },
          { product_code: 'OX-1', quantity: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expect(
      response.body.routing.map((group: { supplier_id: string }) => group.supplier_id).sort(),
    ).toEqual(['SUP-OX', 'SUP-WC']);
    const quantities = Object.fromEntries(
      response.body.routing.flatMap(
        (group: { items: { product_code: string; quantity: number }[] }) =>
          group.items.map((item) => [item.product_code, item.quantity]),
      ),
    );
    expect(quantities).toEqual({ 'WC-1': 1, 'OX-1': 1 });
  });

  it('combines duplicate line items and preserves leading-zero ZIPs', async () => {
    const app = appWithCatalog({ 'CP-1': 'cpap' }, [
      makeSupplier({
        id: 'SUP-BOS',
        categories: new Set(['cpap']),
        zipRanges: [{ start: 2130, end: 2130 }],
        rating: 8,
      }),
    ]);

    const response = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '02130',
        mail_order: false,
        items: [
          { product_code: 'CP-1', quantity: 1 },
          { product_code: 'CP-1', quantity: 2 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.routing[0].supplier_id).toBe('SUP-BOS');
    expect(response.body.routing[0].items).toEqual([
      {
        product_code: 'CP-1',
        quantity: 3,
        category: 'cpap',
        fulfillment_mode: 'local',
      },
    ]);
  });

  it('routes the assessment sample orders through the real catalog', async () => {
    const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../data');
    const catalog = await loadCatalog(dataDir);
    const samples = JSON.parse(await readFile(join(dataDir, 'sample_orders.json'), 'utf8')) as {
      order_id: string;
      customer_zip: string;
      mail_order: boolean;
      items: { product_code: string; quantity: number }[];
      priority?: string;
      notes?: string;
    }[];
    const app = createApp(catalog);

    for (const sample of samples) {
      const response = await request(app).post(routePath).send(sample);
      expect(response.status, sample.order_id).toBe(200);
      expect(response.body.feasible, sample.order_id).toBe(true);

      const routedQuantity = new Map<string, number>();
      for (const group of response.body.routing as {
        items: {
          product_code: string;
          quantity: number;
          category: string;
          fulfillment_mode: string;
        }[];
      }[]) {
        expect(group.items.length).toBeGreaterThan(0);
        for (const item of group.items) {
          expect(item.category).toBeTruthy();
          expect(['local', 'mail_order']).toContain(item.fulfillment_mode);
          routedQuantity.set(
            item.product_code,
            (routedQuantity.get(item.product_code) ?? 0) + item.quantity,
          );
        }
      }

      const requested = new Map<string, number>();
      for (const item of sample.items) {
        requested.set(item.product_code, (requested.get(item.product_code) ?? 0) + item.quantity);
      }
      expect(Object.fromEntries(routedQuantity), sample.order_id).toEqual(
        Object.fromEntries(requested),
      );
    }
  });
});
