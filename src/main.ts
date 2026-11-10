import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { enableServerErrorHandling, handleFatalError } from './runtime/fatal-error.js';
import { enableGracefulShutdown } from './runtime/graceful-shutdown.js';

try {
  const { port, dataDir } = getEnv();
  const app = await createApp(dataDir);
  const server = app.listen(port, '0.0.0.0', () => {
    console.info('Order router listening', { port });
  });
  enableServerErrorHandling(server);
  enableGracefulShutdown(server);
} catch (error) {
  handleFatalError(error);
}
