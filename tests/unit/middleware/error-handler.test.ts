import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { handleError } from '../../../src/middleware/error-handler.js';

function appWithError(error: unknown): express.Express {
  const app = express();
  app.get('/boom', (_request, _response, next) => {
    next(error);
  });
  app.use(handleError);
  return app;
}

describe('handleError', () => {
  // BR-022, BR-024
  it('returns HTTP 200 with a body-parser message for invalid JSON types', async () => {
    const error = Object.assign(new Error('bad json'), { type: 'entity.parse.failed' });
    const response = await request(appWithError(error)).get('/boom');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feasible: false,
      errors: ['Request body must contain valid JSON.'],
    });
  });

  // BR-022, BR-024
  it('returns HTTP 200 with an exposed client message', async () => {
    const error = Object.assign(new Error('Nope'), { expose: true });
    const response = await request(appWithError(error)).get('/boom');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ feasible: false, errors: ['Nope'] });
  });

  // BR-022, BR-024
  it('logs unexpected errors and returns a generic failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(appWithError(new Error('secret'))).get('/boom');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feasible: false,
      errors: ['Unable to process the routing request.'],
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('delegates when headers were already sent', () => {
    const next = vi.fn();
    const response = {
      headersSent: true,
      status: vi.fn(),
      json: vi.fn(),
    };
    handleError(new Error('late'), {} as express.Request, response as never, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(response.status).not.toHaveBeenCalled();
  });
});
