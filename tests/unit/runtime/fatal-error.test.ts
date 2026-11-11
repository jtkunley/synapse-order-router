import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableServerErrorHandling, handleFatalError } from '../../../src/runtime/fatal-error';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleFatalError', () => {
  it('logs and exits with code 1', () => {
    const output = { error: vi.fn() };
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    handleFatalError(new Error('boom'), 'failed', output);

    expect(output.error).toHaveBeenCalledWith('failed', expect.any(Error));
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });
});

describe('enableServerErrorHandling', () => {
  it('routes server errors through handleFatalError', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const server = new EventEmitter() as Server;

    enableServerErrorHandling(server);
    server.emit('error', new Error('listen failed'));
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(error).toHaveBeenCalled();
    exit.mockRestore();
  });
});
