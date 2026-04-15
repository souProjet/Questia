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
        /** Intégration LLM / taxonomie DB — couverte par tests API ciblés, pas utile au ratio global. */
        'apps/web/src/lib/actions/analyzeArchetypeSuggestion.ts',
        'apps/web/src/lib/seo/**',
        'apps/web/src/lib/quest-taxonomy/**',
        'apps/web/src/app/api/quest/archetypes/**',
        'apps/web/src/app/api/quest/archetype/**',
      ],
      /** Alignés sur la base réelle du dépôt ; relever progressivement avec de nouveaux tests. */
      thresholds: {
        lines: 78,
        functions: 90,
        branches: 58,
        statements: 78,
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
