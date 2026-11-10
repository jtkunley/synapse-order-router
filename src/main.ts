import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { enableServerErrorHandling, handleFatalError } from './runtime/fatal-error.js';
import { enableGracefulShutdown } from './runtime/graceful-shutdown.js';
import { loadCatalog } from './services/catalog/index.js';

try {
  const { port, dataDir } = getEnv();
  const catalog = await loadCatalog(dataDir);
  const server = createApp(catalog).listen(port, '0.0.0.0', () => {
    console.info('Order router listening', { port });
  });
  enableServerErrorHandling(server);
  enableGracefulShutdown(server);
} catch (error) {
  handleFatalError(error);
}
