import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
    react()
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('antd') || id.includes('@ant-design')) return 'vendor-antd'
          if (id.includes('chart.js') || id.includes('recharts')) return 'vendor-charts'
          if (id.includes('exceljs') || id.includes('read-excel-file')) return 'vendor-excel'
          if (id.includes('sweetalert2')) return 'vendor-alerts'
          if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-dates'
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
