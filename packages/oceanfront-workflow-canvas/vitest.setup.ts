import { config } from '@vue/test-utils'

config.global.stubs = {
  RouterLink: true
}

const shouldSilenceVueWarn = (args: unknown[]) => {
  const text = args.map(String).join(' ')
  return text.includes('Failed to resolve component:')
}

const originalWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  if (shouldSilenceVueWarn(args)) return
  originalWarn(...args)
}
