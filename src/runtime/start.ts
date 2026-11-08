import { createApp } from '../app.js';
import { getEnv } from '../config/env.js';
import { loadCatalog } from '../services/catalog/index.js';
import { enableServerErrorHandling, handleFatalError } from './fatal-error.js';
import { enableGracefulShutdown } from './graceful-shutdown.js';

export async function start(): Promise<void> {
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
}
