import { beforeEach, describe, expect, it, vi } from 'vitest';

const start = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('../../src/runtime/start.js', () => ({ start }));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    start.mockClear();
  });

  it('starts the server when loaded', async () => {
    await import('../../src/main.js');
    expect(start).toHaveBeenCalledOnce();
  });
});
