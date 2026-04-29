import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

const junitOutputFile = process.env.VITEST_JUNIT_FILE || './test-results/vitest.junit.xml'
const coverageReportsDirectory = process.env.VITEST_COVERAGE_DIR || './coverage'

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
          junit: junitOutputFile,
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          reportsDirectory: coverageReportsDirectory,
          include: [
            'src/**/*.{ts,tsx}',
            'server.js',
            'server/**/*.js',
            'shared/**/*.js',
            'usage-normalizer.js',
          ],
          exclude: ['src/**/*.d.ts', 'tests/**', 'shared/locales/**'],
          thresholds: {
            statements: 70,
            branches: 60,
            functions: 70,
            lines: 70,
          },
        },
        projects: [
          {
            extends: true,
            test: {
              name: 'architecture',
              include: ['tests/architecture/**/*.test.ts'],
              environment: 'node',
              globals: true,
              setupFiles: ['./vitest.setup.node.ts'],
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
              setupFiles: ['./vitest.setup.node.ts'],
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
              setupFiles: ['./vitest.setup.node.ts', './vitest.setup.frontend.ts'],
              maxWorkers: '50%',
              testTimeout: 30_000,
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
              setupFiles: ['./vitest.setup.node.ts'],
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
              setupFiles: ['./vitest.setup.node.ts'],
              maxWorkers: 2,
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
