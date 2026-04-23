import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(async () => {
  // Resolve the imported Vite config explicitly before mergeConfig because
  // vite.config may export either a config object or an async config factory.
  // Vitest needs stable test-mode inputs when reusing that config here.
  const resolvedViteConfig =
    typeof viteConfig === 'function'
      ? await viteConfig({
          command: 'serve',
          mode: 'test',
          isSsrBuild: false,
          isPreview: false,
        })
      : viteConfig

  return mergeConfig(
    resolvedViteConfig,
    defineConfig({
      test: {
        include: [],
        reporters: ['default', 'junit'],
        outputFile: {
          junit: './test-results/vitest.junit.xml',
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          reportsDirectory: './coverage',
          include: [
            'src/hooks/**/*.ts',
            'src/lib/**/*.ts',
            'src/components/Dashboard.tsx',
            'shared/app-settings.js',
            'shared/dashboard-preferences.js',
            'usage-normalizer.js',
          ],
          exclude: [
            'src/lib/i18n.ts',
            'src/lib/constants.ts',
            'src/lib/help-content.ts',
            'src/lib/cn.ts',
            'tests/**',
          ],
        },
        projects: [
          {
            extends: true,
            test: {
              name: 'architecture',
              include: ['tests/architecture/**/*.test.ts'],
              environment: 'node',
              globals: true,
              setupFiles: ['./vitest.setup.ts'],
              fileParallelism: false,
              sequence: {
                groupOrder: 0,
              },
            },
          },
          {
            extends: true,
            test: {
              name: 'unit',
              include: ['tests/unit/**/*.test.ts'],
              environment: 'node',
              setupFiles: ['./vitest.setup.ts'],
              maxWorkers: '80%',
              sequence: {
                groupOrder: 1,
              },
            },
          },
          {
            extends: true,
            test: {
              name: 'frontend',
              include: ['tests/frontend/**/*.test.{ts,tsx}'],
              environment: 'jsdom',
              setupFiles: ['./vitest.setup.ts', './vitest.setup.frontend.ts'],
              maxWorkers: '50%',
              sequence: {
                groupOrder: 2,
              },
            },
          },
          {
            extends: true,
            test: {
              name: 'integration',
              include: ['tests/integration/**/*.test.ts'],
              exclude: ['tests/integration/**/*background*.test.ts'],
              environment: 'node',
              setupFiles: ['./vitest.setup.ts'],
              maxWorkers: '50%',
              sequence: {
                groupOrder: 3,
              },
            },
          },
          {
            extends: true,
            test: {
              name: 'integration-background',
              include: ['tests/integration/**/*background*.test.ts'],
              environment: 'node',
              setupFiles: ['./vitest.setup.ts'],
              fileParallelism: false,
              sequence: {
                groupOrder: 4,
              },
            },
          },
        ],
      },
    }),
  )
})
