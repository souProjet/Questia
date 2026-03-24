import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    exclude: ['node_modules', '.next', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'packages/shared/src/**/*.ts',
        'apps/web/src/lib/**/*.ts',
        'apps/web/src/app/api/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/node_modules/**',
        'packages/shared/src/types/**',
      ],
      // Seuil global : la route `quest/daily` et les webhooks nécessitent des jeux de mocks très lourds pour 100 % branches.
      // Le moteur (`packages/shared`) est couvert à ~100 % lignes ; l’API et les libs sont couvertes par tests unitaires + routes.
      thresholds: {
        lines: 85,
        functions: 94,
        branches: 65,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
      '@questia/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
