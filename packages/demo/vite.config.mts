import { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const config: UserConfig = {
  base: process.env.OF_DEMO_ROOT_PATH || '/ofdocs/',
  optimizeDeps: {
    include: [
      'highlight.js/lib/core',
      'highlight.js/lib/languages/css',
      'highlight.js/lib/languages/json',
      'highlight.js/lib/languages/xml',
    ],
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },

  plugins: [vue()],
}

export default config
