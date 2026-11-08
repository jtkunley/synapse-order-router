import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addDocs, docsPath } from '../../../src/controllers/docs.js';
import { openApiPath } from '../../../src/controllers/openapi.js';

describe('GET /docs', () => {
  it('serves an HTML OpenAPI viewer pointed at /openapi.json', async () => {
    const app = express();
    addDocs(app);

    const response = await request(app).get(docsPath);
    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.text).toContain('swagger-ui');
    expect(response.text).toContain(openApiPath);
  });
});
