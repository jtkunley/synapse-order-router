import { logger } from '@jtkunley/logger';
import { createApp } from './app.js';
import { loadCatalog } from './services/catalog.js';
import { getEnv } from './config/env.js';
import { enableServerErrorHandling, handleFatalError } from './runtime/fatal-error.js';
import { enableGracefulShutdown } from './runtime/graceful-shutdown.js';

const rootLogger = logger.init('synapse-order-router');

async function start(): Promise<void> {
  try {
    const { port, dataDir } = getEnv();
    const log = rootLogger.child('server', 'start');
    const catalog = await loadCatalog(dataDir);
    const server = createApp(catalog).listen(port, '0.0.0.0', () => {
      log.info('Order router listening', { port });
    });
    enableServerErrorHandling(server, rootLogger);
    enableGracefulShutdown(server, rootLogger);
  } catch (error) {
    await handleFatalError(rootLogger, error);
  }
}

await start();
