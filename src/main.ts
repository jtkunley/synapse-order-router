import { createApp } from './app';
import { getEnv } from './config/env';
import { enableServerErrorHandling, handleFatalError } from './runtime/fatal-error';
import { enableGracefulShutdown } from './runtime/graceful-shutdown';

try {
  const { port } = getEnv();
  const app = await createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.info('Order router listening', { port });
  });
  enableServerErrorHandling(server);
  enableGracefulShutdown(server);
} catch (error) {
  handleFatalError(error);
}
