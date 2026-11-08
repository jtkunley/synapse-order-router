import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { openApiPath, registerOpenApi } from '../../../src/controllers/openapi.js';
import { routePaths } from '../../../src/controllers/route.js';

describe('registerOpenApi', () => {
  it('serves an OpenAPI document for the configured paths', async () => {
    const app = express();
    registerOpenApi(app, routePaths);

    const response = await request(app).get(openApiPath);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Synapse Order Router', version: '1.0.0' },
    });
    expect(response.body.paths['/api/route'].post.operationId).toBe('routeOrder');
  });
});
