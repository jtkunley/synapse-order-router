import type { Server } from 'node:http';

const signals = ['SIGINT', 'SIGTERM'] as const;

export function enableGracefulShutdown(
  server: Server,
  output: Pick<Console, 'info' | 'error'> = console,
): void {
  let shuttingDown = false;

  async function shutdown(signal: (typeof signals)[number]): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    output.info('Shutting down', { signal });

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      output.info('HTTP server closed');
      process.exit(0);
    } catch (error) {
      output.error('Graceful shutdown failed', error);
      process.exit(1);
    }
  }

  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}
