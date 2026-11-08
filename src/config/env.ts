import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Env {
  port: number;
  dataDir: string;
}

export function getEnv(): Env {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }

  const dataDir = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : fileURLToPath(new URL('../../data/', import.meta.url));

  return { port, dataDir };
}
