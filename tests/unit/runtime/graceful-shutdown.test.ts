import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { RootLogger } from '@jtkunley/logger';
import { describe, expect, it, vi } from 'vitest';
import { enableGracefulShutdown } from '../../../src/runtime/graceful-shutdown.js';

function mockRootLogger() {
  const child = {
    error: vi.fn(),
    info: vi.fn(),
  };
  const rootLogger = {
    child: vi.fn(() => child),
    flush: vi.fn(async () => undefined),
  } as unknown as RootLogger;
  return { rootLogger, child };
}

describe('enableGracefulShutdown', () => {
  it('closes the server, flushes logs, and exits on SIGTERM', async () => {
    const { rootLogger, child } = mockRootLogger();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    server.close = ((callback?: (error?: Error) => void) => {
      callback?.();
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, rootLogger);
    process.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(child.info).toHaveBeenCalledWith('Shutting down', { signal: 'SIGTERM' });
    expect(rootLogger.flush).toHaveBeenCalled();
    exit.mockRestore();
  });

  it('exits with code 1 when server.close fails', async () => {
    const { rootLogger, child } = mockRootLogger();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    server.close = ((callback?: (error?: Error) => void) => {
      callback?.(new Error('close failed'));
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, rootLogger);
    process.emit('SIGINT');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(child.error).toHaveBeenCalledWith('Graceful shutdown failed', expect.any(Error), {});
    exit.mockRestore();
  });

  it('ignores a second shutdown signal while shutdown is in progress', async () => {
    const { rootLogger } = mockRootLogger();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    let closeCalls = 0;
    server.close = ((callback?: (error?: Error) => void) => {
      closeCalls += 1;
      setTimeout(() => callback?.(), 30);
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, rootLogger);
    process.emit('SIGTERM');
    process.emit('SIGINT');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(closeCalls).toBe(1);
    exit.mockRestore();
  });
});
