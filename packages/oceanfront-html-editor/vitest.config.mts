import autoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    autoImport({
      imports: ['vitest'],
      dts: false,
    }),
    vue(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles: [resolve(__dirname, 'vitest.setup.js')],
  },
})
