import type { Server } from 'node:http';

export function handleFatalError(
  error: unknown,
  message = 'Unable to start the order router',
  output: Pick<Console, 'error'> = console,
): never {
  output.error(message, error);
  process.exit(1);
}

export function enableServerErrorHandling(server: Server): void {
  server.on('error', (error) => {
    handleFatalError(error);
  });
}
