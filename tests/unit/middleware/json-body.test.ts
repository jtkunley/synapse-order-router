import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { jsonBody } from '../../../src/middleware/json-body.js';

describe('jsonBody', () => {
  it('parses JSON bodies, including non-object values when strict is false', async () => {
    const app = express();
    app.post('/echo', jsonBody, (request, response) => {
      response.status(200).json({ body: request.body });
    });

    const objectResponse = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send({ a: 1 });
    expect(objectResponse.body).toEqual({ body: { a: 1 } });

    const numberResponse = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('42');
    expect(numberResponse.body).toEqual({ body: 42 });
  });
});
