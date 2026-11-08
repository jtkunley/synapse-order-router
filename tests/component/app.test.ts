import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { makeCatalog, makeSupplier } from '../helpers/catalog.js';

describe('createApp', () => {
  const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
    makeSupplier({
      id: 'SUP-1',
      categories: new Set(['wheelchair']),
      zipRanges: [{ start: 10001, end: 10001 }],
      rating: 8,
    }),
  ]);

  // BUS_RULE-021, BUS_RULE-022
  it('disables x-powered-by and serves openapi plus routing', async () => {
    const app = createApp(catalog);
    const openapi = await request(app).get('/openapi.json');
    expect(openapi.status).toBe(200);
    expect(openapi.body.openapi).toBe('3.1.0');
    expect(openapi.headers['x-powered-by']).toBeUndefined();

    const routed = await request(app)
      .post('/api/route')
      .send({
        order_id: 'ORD-1',
        customer_zip: '10001',
        mail_order: false,
        items: [{ product_code: 'WC-1', quantity: 1 }],
      });
    expect(routed.status).toBe(200);
    expect(routed.body.feasible).toBe(true);
  });

  // BUS_RULE-022, BUS_RULE-024
  it('returns HTTP 200 for invalid JSON bodies', async () => {
    const response = await request(createApp(catalog))
      .post('/api/route')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feasible: false,
      errors: ['Request body must contain valid JSON.'],
    });
  });
});
