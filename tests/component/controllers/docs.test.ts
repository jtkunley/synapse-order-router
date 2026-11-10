import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { docsPath } from '../../../src/controllers/docs.js';
import { openApiPath } from '../../../src/controllers/openapi.js';
import { addRoutes } from '../../../src/routes.js';

describe('GET /docs', () => {
  it('serves an HTML OpenAPI viewer pointed at /openapi.json', async () => {
    const app = express();
    addRoutes(app);

    const response = await request(app).get(docsPath);
    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.text).toContain('swagger-ui');
    expect(response.text).toContain(openApiPath);
    expect(response.text).not.toContain('cdn.jsdelivr.net');
  });

  it.each([
    ['/docs/assets/swagger-ui.css', /text\/css/],
    ['/docs/assets/swagger-ui-bundle.js', /javascript/],
  ])('serves the bundled Swagger UI asset at %s', async (path, contentType) => {
    const app = express();
    addRoutes(app);

    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.type).toMatch(contentType);
    expect(response.headers['cache-control']).toContain('immutable');
  });
});
