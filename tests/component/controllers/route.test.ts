import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { registerRoute, routePath } from '../../../src/controllers/route.js';
import { makeCatalog, makeSupplier } from '../../helpers/catalog.js';

describe('registerRoute', () => {
  const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
    makeSupplier({
      id: 'SUP-1',
      name: 'Local',
      categories: new Set(['wheelchair']),
      zipRanges: [{ start: 10001, end: 10001 }],
      rating: 8,
    }),
  ]);

  it('routes a valid order and reports validation failures with HTTP 200', async () => {
    const app = express();
    app.use(express.json());
    registerRoute(app, catalog);

    const ok = await request(app)
      .post(routePath)
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      feasible: true,
      routing: [{ supplier_id: 'SUP-1', supplier_name: 'Local' }],
    });

    const bad = await request(app).post(routePath).send({
      order_id: '',
      customer_zip: '1',
      mail_order: false,
      items: [],
    });
    expect(bad.status).toBe(200);
    expect(bad.body.feasible).toBe(false);
    expect(bad.body.errors.length).toBeGreaterThan(1);
  });
});
