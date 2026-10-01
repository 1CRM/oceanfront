import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'vmThreads',
    setupFiles: [resolve(import.meta.dirname, 'vitest.setup.ts')],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
})
