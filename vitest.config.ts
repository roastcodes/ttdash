import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
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
}))
