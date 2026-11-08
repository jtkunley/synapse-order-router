import { pathToFileURL } from 'node:url';
import { logger } from '@jtkunley/logger';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { enableServerErrorHandling, handleFatalError } from './runtime/fatal-error.js';
import { enableGracefulShutdown } from './runtime/graceful-shutdown.js';
import { loadCatalog } from './services/catalog.js';

const rootLogger = logger.init('synapse-order-router');

export async function start(): Promise<void> {
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

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  await start();
}
