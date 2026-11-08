import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { RootLogger } from '@jtkunley/logger';
import { describe, expect, it, vi } from 'vitest';
import { enableServerErrorHandling, handleFatalError } from '../../../src/runtime/fatal-error.js';

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

describe('handleFatalError', () => {
  it('logs, flushes, and exits with code 1', async () => {
    const { rootLogger, child } = mockRootLogger();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await handleFatalError(rootLogger, new Error('boom'), 'failed');

    expect(child.error).toHaveBeenCalledWith('failed', expect.any(Error), {});
    expect(rootLogger.flush).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });
});

describe('enableServerErrorHandling', () => {
  it('routes server errors through handleFatalError', async () => {
    const { rootLogger, child } = mockRootLogger();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;

    enableServerErrorHandling(server, rootLogger);
    server.emit('error', new Error('listen failed'));
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(child.error).toHaveBeenCalled();
    exit.mockRestore();
  });
});
