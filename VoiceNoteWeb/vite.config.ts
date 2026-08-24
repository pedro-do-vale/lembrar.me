import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/@hello-pangea') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux')) return 'drag-and-drop';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react')) return 'react';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
  },
})
