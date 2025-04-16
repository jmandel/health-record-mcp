import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path' // Import resolve for path handling

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Default entry point
        tester: resolve(__dirname, 'tester.html'), // New tester entry point
      },
    },
  },
})
