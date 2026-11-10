import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { setCatalog } from '../../src/services/catalog/catalog-store.js';
import { loadCatalog } from '../../src/services/catalog/index.js';
import { makeCatalog, makeSupplier } from '../helpers/catalog.js';

vi.mock('../../src/services/catalog/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/catalog/index.js')>()),
  loadCatalog: vi.fn(),
}));

const order = {
  order_id: 'ORD-1',
  customer_zip: '10001',
  mail_order: false,
  items: [{ product_code: 'WC-1', quantity: 1 }],
};

describe('createApp', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const catalog = makeCatalog({ 'WC-1': 'wheelchair' }, [
    makeSupplier({
      id: 'SUP-1',
      categories: new Set(['wheelchair']),
      zipRanges: [{ start: 10001, end: 10001 }],
      rating: 8,
    }),
  ]);

  // BUS_RULE-021, BUS_RULE-022
  it('disables x-powered-by and serves openapi, docs, and routing', async () => {
    vi.stubEnv('DATA_DIR', '/data');
    setCatalog(catalog);
    const app = await createApp();
    expect(loadCatalog).toHaveBeenCalledWith('/data');

    const openapi = await request(app).get('/openapi.json');
    expect(openapi.status).toBe(200);
    expect(openapi.body.openapi).toBe('3.1.0');
    expect(openapi.headers['x-powered-by']).toBeUndefined();

    const docs = await request(app).get('/docs');
    expect(docs.status).toBe(200);
    expect(docs.type).toMatch(/html/);
    expect(docs.text).toContain('/openapi.json');

    const routed = await request(app).post('/api/route').send(order);
    expect(routed.status).toBe(200);
    expect(routed.body.feasible).toBe(true);
  });

  // BUS_RULE-022, BUS_RULE-024
  it('returns HTTP 200 for invalid JSON bodies', async () => {
    setCatalog(catalog);
    const response = await request(await createApp())
      .post('/api/route')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feasible: false,
      errors: ['Request body must contain valid JSON.'],
    });
  });

  // OPEN-007
  it('rejects when the catalog fails to load', async () => {
    const failure = new Error('products.csv: no data records.');
    vi.mocked(loadCatalog).mockRejectedValueOnce(failure);

    await expect(createApp()).rejects.toBe(failure);
  });
});
