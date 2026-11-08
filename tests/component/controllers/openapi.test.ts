import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addOpenApi, openApiPath } from '../../../src/controllers/openapi.js';

describe('GET /openapi.json', () => {
  it('serves an OpenAPI document for the configured paths', async () => {
    const app = express();
    addOpenApi(app);

    const response = await request(app).get(openApiPath);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Synapse Order Router', version: '1.0.0' },
    });
    expect(response.body.paths['/api/route'].post.operationId).toBe('routeOrder');
  });
});
