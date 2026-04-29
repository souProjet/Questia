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
        'apps/web/src/lib/admin/**',
        'apps/web/src/lib/auth/**',
        'apps/web/src/lib/analytics/**',
        'apps/web/src/app/api/admin/**',
        'apps/web/src/app/api/user/**',
        /** Orchestration OpenAI + `'use server'` : non exécutée dans les tests unitaires (reste couverte par quest-gen.test + route). */
        'apps/web/src/lib/quest-gen/generateQuest.ts',
        'apps/web/src/lib/quest-gen/index.ts',
      ],
      thresholds: {
        lines: 85,
        /** ~91 % avec le périmètre actuel (routes pack, auraColors, helpers shop partiels, etc.) */
        functions: 90,
        branches: 60,
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
