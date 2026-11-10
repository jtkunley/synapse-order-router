import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'component',
          environment: 'node',
          include: ['tests/component/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/models/catalog.ts', 'src/models/product.ts', 'src/models/supplier.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      skipFull: false,
    },
  },
});
