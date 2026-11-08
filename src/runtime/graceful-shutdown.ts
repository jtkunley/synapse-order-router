import type { Server } from 'node:http';
import type { RootLogger } from '@jtkunley/logger';

const signals = ['SIGINT', 'SIGTERM'] as const;

export function enableGracefulShutdown(server: Server, rootLogger: RootLogger): void {
  let shuttingDown = false;

  async function shutdown(signal: (typeof signals)[number]): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    const log = rootLogger.child('server', 'shutdown');
    log.info('Shutting down', { signal });

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      log.info('HTTP server closed', {});
      await rootLogger.flush();
      process.exit(0);
    } catch (error) {
      log.error('Graceful shutdown failed', error, {});
      await rootLogger.flush();
      process.exit(1);
    }
  }

  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}
