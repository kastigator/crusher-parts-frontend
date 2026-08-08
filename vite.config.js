import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { releaseManifestPlugin } from './build/releaseManifest.js'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')
  const base = env.VITE_BASE_URL || './'

  return {
    base,
    plugins: [react(), releaseManifestPlugin()].filter(Boolean),
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: {
      port: 5173,
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
  }
})
