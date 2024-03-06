import { readonly, ref } from 'vue'
import { Config, ConfigManager } from './config'
import { readonlyUnref } from './util'

const lastScroll = ref(new Date())

type WindowRect = {
  scrollX: number
  scrollY: number
  width: number
  height: number
}
const windowRect = ref<WindowRect>({
  scrollX: 0,
  scrollY: 0,
  width: 0,
  height: 0,
})
const isHighDpi = window.matchMedia?.(
  '(-webkit-min-device-pixel-ratio: 2), (min-device-pixel-ratio: 2), (min-resolution: 192dpi))',
).matches

function initEvents() {
  function onScroll() {
    windowRect.value = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  window.addEventListener('resize', onScroll, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}
let inited = false

export interface LayoutState {
  readonly isMobile: boolean
  readonly isHighDpi: boolean
  readonly mobileBreakpoint: number
  readonly lastScroll: Date
  readonly windowRect: WindowRect
}

class LayoutManager implements LayoutState {
  mobileBreakpoint = 1024

  get isHighDpi() {
    return isHighDpi
  }

  get isMobile() {
    return windowRect.value.width < this.mobileBreakpoint
  }

  get lastScroll(): Date {
    return lastScroll.value
  }

  get windowRect(): WindowRect {
    return readonly(windowRect.value)
  }
}

const configManager = new ConfigManager('oflay', LayoutManager)

export function setMobileBreakpoint(bp: number): void {
  configManager.extendingManager.mobileBreakpoint = bp
}

export function useLayout(config?: Config): LayoutState {
  if (!inited) {
    initEvents()
    inited = true
  }
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}
