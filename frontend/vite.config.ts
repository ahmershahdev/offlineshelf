import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  html: {
    // Placeholder that nginx swaps for a per-request nonce (deploy: sub_filter with $request_id).
    cspNonce: '__CSP_NONCE__',
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    sourcemap: false,
    // three.js is its own lazily imported chunk (about 130 kB gzipped), loaded after first paint.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
        },
      },
    },
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
