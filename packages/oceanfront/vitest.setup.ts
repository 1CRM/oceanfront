import { config } from '@vue/test-utils'
import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

config.global.stubs = {
  RouterLink: true
}

const shouldSilenceVueWarn = (args: unknown[]) => {
  const text = args.map(String).join(' ')
  return (
    text.includes('Failed to resolve component:') ||
    text.includes('enumerating keys on a component instance')
  )
}

const originalWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  if (shouldSilenceVueWarn(args)) return
  originalWarn(...args)
}
