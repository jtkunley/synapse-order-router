import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listen,
  createApp,
  loadCatalog,
  getEnv,
  enableServerErrorHandling,
  enableGracefulShutdown,
  handleFatalError,
} = vi.hoisted(() => {
  const listen = vi.fn(function listen(
    this: object,
    _port: number,
    _host: string,
    callback?: () => void,
  ) {
    callback?.();
    return this;
  });
  return {
    listen,
    createApp: vi.fn(() => ({ listen })),
    loadCatalog: vi.fn(async () => ({ products: new Map(), suppliers: [] })),
    getEnv: vi.fn(() => ({ port: 3000, dataDir: '/tmp/data' })),
    enableServerErrorHandling: vi.fn(),
    enableGracefulShutdown: vi.fn(),
    handleFatalError: vi.fn(() => undefined as never),
  };
});

vi.mock('../../src/app.js', () => ({ createApp }));
vi.mock('../../src/services/catalog/index.js', () => ({ loadCatalog }));
vi.mock('../../src/config/env.js', () => ({ getEnv }));
vi.mock('../../src/runtime/fatal-error.js', () => ({
  enableServerErrorHandling,
  handleFatalError,
}));
vi.mock('../../src/runtime/graceful-shutdown.js', () => ({ enableGracefulShutdown }));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getEnv.mockReturnValue({ port: 3000, dataDir: '/tmp/data' });
    loadCatalog.mockResolvedValue({ products: new Map(), suppliers: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('loads config and catalog, listens, and wires runtime handlers', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await import('../../src/main.js');

    expect(getEnv).toHaveBeenCalled();
    expect(loadCatalog).toHaveBeenCalledWith('/tmp/data');
    expect(createApp).toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));
    expect(enableServerErrorHandling).toHaveBeenCalled();
    expect(enableGracefulShutdown).toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('Order router listening', { port: 3000 });
  });

  it('delegates startup failures to handleFatalError', async () => {
    getEnv.mockImplementation(() => {
      throw new Error('bad port');
    });
    await import('../../src/main.js');
    expect(handleFatalError).toHaveBeenCalledWith(expect.any(Error));
  });
});
