import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { enableGracefulShutdown } from '../../../src/runtime/graceful-shutdown.js';

function mockOutput() {
  return {
    error: vi.fn(),
    info: vi.fn(),
  };
}

describe('enableGracefulShutdown', () => {
  it('closes the server and exits on SIGTERM', async () => {
    const output = mockOutput();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    server.close = ((callback?: (error?: Error) => void) => {
      callback?.();
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, output);
    process.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(output.info).toHaveBeenCalledWith('Shutting down', { signal: 'SIGTERM' });
    exit.mockRestore();
  });

  it('exits with code 1 when server.close fails', async () => {
    const output = mockOutput();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    server.close = ((callback?: (error?: Error) => void) => {
      callback?.(new Error('close failed'));
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, output);
    process.emit('SIGINT');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(output.error).toHaveBeenCalledWith('Graceful shutdown failed', expect.any(Error));
    exit.mockRestore();
  });

  it('ignores a second shutdown signal while shutdown is in progress', async () => {
    const output = mockOutput();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;
    let closeCalls = 0;
    server.close = ((callback?: (error?: Error) => void) => {
      closeCalls += 1;
      setTimeout(() => callback?.(), 30);
      return server;
    }) as Server['close'];

    enableGracefulShutdown(server, output);
    process.emit('SIGTERM');
    process.emit('SIGINT');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(closeCalls).toBe(1);
    exit.mockRestore();
  });
});
