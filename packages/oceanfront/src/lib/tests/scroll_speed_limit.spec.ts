import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APPLE_SCROLL_SPEED_MULTIPLIER,
  createScrollSpeedLimit,
  isAppleWebKit
} from '../scroll_speed_limit'

describe('isAppleWebKit', () => {
  it('detects Safari and excludes Chromium-based browsers', () => {
    expect(
      isAppleWebKit(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      )
    ).toBe(true)
    expect(
      isAppleWebKit(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false)
  })
})

describe('createScrollSpeedLimit', () => {
  let now = 0
  let top = 0

  beforeEach(() => {
    now = 1000
    top = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
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

  const safariUa =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

  const wheel = (
    deltaY: number,
    extra: Partial<WheelEvent> & { cancelable?: boolean } = {}
  ) => {
    const { cancelable = true, ...rest } = extra
    return {
      ctrlKey: false,
      deltaX: 0,
      deltaY,
      deltaMode: 0,
      cancelable,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      ...rest
    } as unknown as WheelEvent
  }

  it('on Apple owns the gesture and applies under-budget deltas immediately', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(safariUa)

    const limit = createScrollSpeedLimit({
      maxPxPerSec: 4000,
      getScrollRoot: () => window,
      containerEl: () => document.createElement('div'),
      isOnScreen: () => true
    })

    limit.reset()

    now += 16
    const first = wheel(20)
    limit.handleWheel(first)
    expect(first.preventDefault).toHaveBeenCalled()
    expect(top).toBe(20)

    // Oversized tick is capped (Apple ceiling = 4000 * multiplier).
    now += 16
    const mid = wheel(2000, { cancelable: false })
    limit.handleWheel(mid)
    const appleMax = 4000 * APPLE_SCROLL_SPEED_MULTIPLIER
    // Burst (80ms) after prior 20px spend + 16ms refill, capped by appleMax.
    const burst = (appleMax * 80) / 1000
    expect(top).toBeLessThan(20 + 2000)
    expect(top).toBeGreaterThan(20)
    expect(top).toBeLessThanOrEqual(20 + burst)

    // No scrollTop rewrite from the scroll listener (jitter source).
    top = 5000
    now += 16
    limit.handleScroll()
    expect(top).toBe(5000)
  })

  it('on Apple ignores mid-gesture wheels if the began event was missed', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(safariUa)

    const limit = createScrollSpeedLimit({
      maxPxPerSec: 4000,
      getScrollRoot: () => window,
      containerEl: () => document.createElement('div'),
      isOnScreen: () => true
    })

    limit.reset()
    now += 16
    const mid = wheel(500, { cancelable: false })
    limit.handleWheel(mid)
    expect(mid.preventDefault).not.toHaveBeenCalled()
    expect(top).toBe(0)
  })

  it('on non-Apple leaves under-budget wheels native and corrects scroll jumps', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    const limit = createScrollSpeedLimit({
      maxPxPerSec: 4000,
      getScrollRoot: () => window,
      containerEl: () => document.createElement('div'),
      isOnScreen: () => true
    })

    limit.reset()

    now += 16
    const small = wheel(20)
    limit.handleWheel(small)
    expect(small.preventDefault).not.toHaveBeenCalled()
    expect(top).toBe(0)

    now += 200
    top = 5000
    limit.handleScroll()
    expect(top).toBe(400)
  })
})
