import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  "./packages/of-colorscheme-editor/vitest.config.mts",
  "./packages/oceanfront-html-editor/vitest.config.mts",
  "./packages/oceanfront/vitest.config.mts",
  "./packages/demo/vite.config.mts"
])
