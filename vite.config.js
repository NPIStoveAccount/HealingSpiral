import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: ['es2020', 'chrome87', 'safari14', 'firefox78', 'edge88'],
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        explorer: path.resolve(__dirname, 'explorer.html'),
      },
      output: {
        entryFileNames: 'healing-spiral-[hash].js',
      },
    },
  },
})
