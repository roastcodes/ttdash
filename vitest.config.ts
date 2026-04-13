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
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
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
      },
    }),
  )
})
