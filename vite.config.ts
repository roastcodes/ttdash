import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs/promises'

async function readPackageJson() {
  const packageJsonPath = path.resolve(__dirname, 'package.json')
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
  return JSON.parse(packageJsonContent)
}

export default defineConfig(async () => {
  const packageJson = await readPackageJson()

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor'
            if (id.includes('@radix-ui') || id.includes('cmdk')) return 'ui-vendor'
            if (id.includes('framer-motion')) return 'motion-vendor'
            if (id.includes('lucide-react')) return 'icons-vendor'
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  }
})
