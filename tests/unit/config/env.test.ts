import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { getEnv } from '../../../src/config/env';

const original = { PORT: process.env.PORT, DATA_DIR: process.env.DATA_DIR };

afterEach(() => {
  if (original.PORT === undefined) delete process.env.PORT;
  else process.env.PORT = original.PORT;
  if (original.DATA_DIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = original.DATA_DIR;
});

describe('getEnv', () => {
  it('defaults port to 3000 and resolves the bundled data directory', () => {
    delete process.env.PORT;
    delete process.env.DATA_DIR;

    const env = getEnv();
    expect(env.port).toBe(3000);
    expect(env.dataDir).toBe(fileURLToPath(new URL('../../../data/', import.meta.url)));
  });

  it('reads PORT and DATA_DIR from the environment', () => {
    process.env.PORT = '8080';
    process.env.DATA_DIR = './tmp-data';

    const env = getEnv();
    expect(env.port).toBe(8080);
    expect(env.dataDir).toBe(resolve('./tmp-data'));
  });

  it('rejects an invalid PORT', () => {
    process.env.PORT = '0';
    expect(() => getEnv()).toThrow(/PORT must be an integer/);
  });
});
