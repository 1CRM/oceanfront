import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScrollLock } from '../scroll_lock'

describe('createScrollLock', () => {
  let top = 0
  let locked = false

  beforeEach(() => {
    top = 0
    locked = false
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => top)
    vi.spyOn(window, 'scrollTo').mockImplementation(((opts: unknown) => {
      if (opts && typeof opts === 'object' && 'top' in opts) {
        top = Number((opts as { top: number }).top)
      }
    }) as typeof window.scrollTo)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const wheel = (deltaY: number) =>
    ({
      ctrlKey: false,
      deltaX: 0,
      deltaY,
      deltaMode: 0,
      cancelable: true,
      target: document.createElement('div'),
      preventDefault: vi.fn()
    }) as unknown as WheelEvent

  it('freezes scrollTop and blocks wheel while locked', () => {
    const lock = createScrollLock({
      getScrollRoot: () => window,
      containerEl: () => document.createElement('div'),
      isLocked: () => locked
    })

    top = 400
    locked = true
    lock.captureIfNeeded()

    top = 900
    lock.handleScroll()
    expect(top).toBe(400)

    const event = wheel(80)
    lock.handleWheel(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(top).toBe(400)
  })

  it('allows native scrolling once unlocked', () => {
    const lock = createScrollLock({
      getScrollRoot: () => window,
      containerEl: () => document.createElement('div'),
      isLocked: () => locked
    })

    top = 400
    locked = true
    lock.captureIfNeeded()

    locked = false
    top = 900
    lock.handleScroll()
    expect(top).toBe(900)

    const event = wheel(80)
    lock.handleWheel(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
