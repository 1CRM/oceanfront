import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import dts from 'unplugin-dts/vite'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ command, mode }): any => {
  const dev = mode === 'development'
  const plugins = [
    vue(),
    ...(dev
      ? []
      : [
          dts({
            bundleTypes: true,
            processor: 'vue',
            tsconfigPath: './tsconfig.build.json'
          })
        ])
  ]
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'oceanfront-workflow-canvas',
        fileName: 'oceanfront-workflow-canvas',
        formats: ['es']
      },
      emptyOutDir: !dev,
      rollupOptions: {
        external: ['vue', 'oceanfront'],
        output: {
          assetFileNames: 'oceanfront-workflow-canvas.[ext]'
        }
      },
      reportCompressedSize: !dev,
      sourcemap: true
    },
    define: {
      __DEV__: JSON.stringify(dev),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    plugins
  }
})
