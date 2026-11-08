import type { Server } from 'node:http';
import type { RootLogger } from '@jtkunley/logger';

export async function handleFatalError(
  rootLogger: RootLogger,
  error: unknown,
  message = 'Unable to start the order router',
): Promise<never> {
  rootLogger.child('server', 'fatal').error(message, error, {});
  await rootLogger.flush();
  process.exit(1);
}

export function enableServerErrorHandling(server: Server, rootLogger: RootLogger): void {
  server.on('error', (error) => {
    void handleFatalError(rootLogger, error);
  });
}
