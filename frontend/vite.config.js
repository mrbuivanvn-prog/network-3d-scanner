import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/go.sum', '**/build/**', '**/node_modules/**']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
