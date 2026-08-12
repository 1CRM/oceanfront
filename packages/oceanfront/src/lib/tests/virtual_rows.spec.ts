import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  VIRTUAL_SCROLL_FAST_SAMPLES,
  VIRTUAL_SCROLL_SETTLE_MS,
  useVirtualRows,
  type VirtualRowsRange
} from '../virtual_rows'
import { createRowHeightStore } from '../virtual_row_heights'

const ROW_HEIGHT = 40
const VIEWPORT = 800
const TOTAL_ROWS = 10000
const CONTAINER_HEIGHT = TOTAL_ROWS * ROW_HEIGHT

/** Pixels the fake page has scrolled; drives the container's rect. */
let pageOffset = 0
let scrollToSpy: ReturnType<typeof vi.fn>
let realGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect

const setPageOffset = (offset: number) => {
  pageOffset = offset
  window.dispatchEvent(new Event('scroll'))
}

/** Runs pending rAF callbacks (faked as timers) and the settle timeout. */
const flushFrames = (ms = 20) => vi.advanceTimersByTime(ms)

/** Drive consecutive oversized jumps so fling mode can engage. */
const flingBy = (from: number, step: number) => {
  setPageOffset(from)
  for (let i = 1; i <= VIRTUAL_SCROLL_FAST_SAMPLES; i++) {
    setPageOffset(from + step * i)
  }
}

/** Total page height, i.e. how far the fake page can be scrolled. */
const setPageHeight = (height: number) =>
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: height
  })

const mountRows = (total: number, rowHeight = ROW_HEIGHT) => {
  const ranges: VirtualRowsRange[] = []
  const store = createRowHeightStore(rowHeight)
  const Harness = defineComponent({
    setup(_props, { expose }) {
      const container = ref<HTMLElement | null>(null)
      const api = useVirtualRows({
        containerRef: container,
        totalCount: computed(() => total),
        metrics: computed(() => store),
        onRangeChange: (range) => ranges.push(range)
      })
      expose(api)
      return () => h('div', { ref: container })
    }
  })
  const wrapper = mount(Harness, { attachTo: document.body })
  return { wrapper, api: wrapper.vm as any, ranges, store }
}

beforeEach(() => {
  pageOffset = 0
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'performance'
    ]
  })
  scrollToSpy = vi.fn()
  window.scrollTo = scrollToSpy as any
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: VIEWPORT
  })
  setPageHeight(CONTAINER_HEIGHT)
  realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      top: -pageOffset,
      bottom: CONTAINER_HEIGHT - pageOffset,
      height: CONTAINER_HEIGHT,
      left: 0,
      right: 1000,
      width: 1000,
      x: 0,
      y: -pageOffset,
      toJSON: () => ({})
    } as DOMRect
  }
})

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realGetBoundingClientRect
  delete (document.documentElement as any).scrollHeight
  vi.useRealTimers()
})

describe('useVirtualRows', () => {
  it('advances the window as the page scrolls', () => {
    const { api } = mountRows(10000)
    expect(api.rangeStart).toBe(0)

    setPageOffset(40000) // row 1000
    flushFrames()
    // Past the settle the window is back to its normal overscan, so this also
    // pins how tightly it hugs the viewport once the gesture is over.
    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)

    expect(api.rangeStart).toBeLessThanOrEqual(1000)
    expect(api.rangeStart).toBeGreaterThan(980)
    expect(api.rangeEnd).toBeGreaterThan(1020)
  })

  it('keeps total height stable no matter where the window sits', () => {
    const { api } = mountRows(10000)
    const totalHeight = 10000 * ROW_HEIGHT

    for (const offset of [0, 4000, 120000, 399200]) {
      setPageOffset(offset)
      flushFrames()
      const windowHeight = (api.rangeEnd - api.rangeStart) * ROW_HEIGHT
      expect(api.topSpacerHeight + windowHeight + api.bottomSpacerHeight).toBe(
        totalHeight
      )
    }
  })

  it('reports unsettled while scrolling and settles after the gesture', () => {
    const { api } = mountRows(10000)
    expect(api.settled).toBe(true)

    setPageOffset(4000)
    flushFrames()
    expect(api.settled).toBe(false)

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    expect(api.settled).toBe(true)
  })

  it('emits the settled window once a fling ends', async () => {
    const { api, ranges } = mountRows(10000)
    setPageOffset(40000)
    flushFrames()
    await nextTick()
    expect(ranges.at(-1)?.settled).toBe(false)

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    await nextTick()
    const last = ranges.at(-1)!
    expect(last.settled).toBe(true)
    expect(last.start).toBe(api.rangeStart)
    expect(last.end).toBe(api.rangeEnd)
  })

  it('keeps rendering real rows while scrolling stays within the viewport', () => {
    const { api } = mountRows(10000)

    for (let offset = 100; offset <= 1000; offset += 100) {
      setPageOffset(offset)
      expect(api.isFastScrolling).toBe(false)
    }
  })

  it('does not enter fling mode on a single oversized jump', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()

    // One laggy frame can cover more than a viewport; that alone must not flip
    // the body onto placeholders for the rest of the gesture.
    setPageOffset(100 + VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(false)
  })

  it('leaves fling mode on the first ordinary sample', () => {
    const { api } = mountRows(10000)
    flingBy(100, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)

    // Medium scrolling after a fling must restore real rows immediately —
    // sticky hysteresis is what left loaded data looking like skeletons.
    setPageOffset(100 + (VIEWPORT + 100) * VIRTUAL_SCROLL_FAST_SAMPLES + 200)
    expect(api.isFastScrolling).toBe(false)
  })

  it('keeps a viewport window while flinging, and spacers hold the rest', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)

    // Sustained jumps larger than a viewport trip fling mode — but the window
    // still tracks the scroll so the viewport never goes blank.
    flingBy(100, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)
    expect(api.rangeStart).toBeGreaterThan(0)
    const windowHeight = (api.rangeEnd - api.rangeStart) * ROW_HEIGHT
    expect(api.topSpacerHeight + windowHeight + api.bottomSpacerHeight).toBe(
      10000 * ROW_HEIGHT
    )

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    expect(api.isFastScrolling).toBe(false)
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)
  })

  it('advances the window through a fling without settling', async () => {
    const { api, ranges } = mountRows(10000)
    flingBy(100, 40000)
    expect(api.isFastScrolling).toBe(true)
    await nextTick()
    const start = api.rangeStart

    // The window must follow the scroll; freezing it would leave the viewport
    // on spacers. Data loading still waits on `settled`. Keep jumps large so
    // fling mode does not drop out mid-gesture.
    for (const offset of [120000, 160000, 210000]) {
      setPageOffset(offset)
      await nextTick()
      expect(api.settled).toBe(false)
      expect(api.isFastScrolling).toBe(true)
    }
    expect(api.rangeStart).toBeGreaterThan(start)
    expect(ranges.at(-1)?.settled).toBe(false)

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    await nextTick()
    expect(api.rangeStart).toBeGreaterThan(start)
    expect(ranges.at(-1)?.settled).toBe(true)
    expect(ranges.at(-1)?.start).toBe(api.rangeStart)
  })

  it('flags a fling even when rendering is slow enough to space the samples out', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)

    // Each window took 200ms to build, so the samples are 200ms apart. Judged
    // as a speed that is a mere ~20px/ms and reads as unhurried scrolling —
    // the slower rendering gets, the slower the scroll looks, and the fling
    // ends up on the expensive path that caused the delay.
    vi.advanceTimersByTime(200)
    const step = VIEWPORT + 100
    setPageOffset(100 + step)
    setPageOffset(100 + step * 2)

    expect(api.isFastScrolling).toBe(true)
  })

  it('still judges a user scroll that lands after a height correction', () => {
    const { api } = mountRows(10000)
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0
    })
    setPageOffset(100)

    // Measured rows correct the offset constantly, so a correction is nearly
    // always in flight during a fling. The event it expects must not be allowed
    // to consume the user's own sample.
    api.compensateScroll(20)
    flushFrames()
    ;(window as any).scrollY = 40000
    setPageOffset(40000)
    setPageOffset(40000 + VIEWPORT + 100)

    expect(api.isFastScrolling).toBe(true)
  })

  it('does not read a scroll the list changing height caused as a fling', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()
    expect(api.isFastScrolling).toBe(false)

    // The page shrank, so the browser moved the offset to match — either
    // clamping it to the new maximum or anchoring the content on screen. Read
    // as a fling, this is a loop: placeholders are a different height than the
    // rows they stand in for, so flagging one changes the height again. Past
    // the last row, where the bottom spacer is gone, it never damps out.
    setPageHeight(CONTAINER_HEIGHT - 4000)
    setPageOffset(4100)
    setPageOffset(4100 + VIEWPORT + 100)

    expect(api.isFastScrolling).toBe(false)
  })

  it('judges the next sample once the height has settled again', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    setPageHeight(CONTAINER_HEIGHT - 4000)
    setPageOffset(4100)

    // A height change excuses the sample that came with it, not the gesture.
    const step = VIEWPORT + 100
    setPageOffset(4100 + step)
    setPageOffset(4100 + step * 2)

    expect(api.isFastScrolling).toBe(true)
  })

  it('still flags a fling that outruns the height change it renders', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)

    // Rows are measured as they render, so during a first pass through a list
    // the height keeps changing while the user flings. Only the part of the
    // jump the height can account for is discounted.
    setPageHeight(CONTAINER_HEIGHT + 600)
    setPageOffset(40100)
    setPageHeight(CONTAINER_HEIGHT + 900)
    setPageOffset(80100)

    expect(api.isFastScrolling).toBe(true)
  })

  it('does not read our own scroll corrections as a fling', () => {
    const { api } = mountRows(10000)
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })

    api.scrollToOffset(80000)
    setPageOffset(80000)
    // Landing far away was our doing; the user has scrolled 100px since.
    setPageOffset(80100)

    expect(api.isFastScrolling).toBe(false)
  })

  it('tracks the offset within the scroll event, not a frame later', () => {
    const { api } = mountRows(10000)

    setPageOffset(40000)

    // No rAF has run yet: a window measured one frame late would send every
    // consumer (loading, restore, sticky headers) a position the list has
    // already left.
    expect(api.scrolledPast).toBe(40000)
    expect(api.rangeStart).toBeLessThanOrEqual(1000)
    expect(api.rangeStart).toBeGreaterThan(900)
    expect(api.rangeEnd).toBeGreaterThan(1000)
  })

  it('compensateScroll shifts the scroll root by the given delta', () => {
    const { api } = mountRows(10000)
    setPageOffset(40000)
    flushFrames()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40000
    })
    scrollToSpy.mockClear()

    api.compensateScroll(120)
    flushFrames()

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 40120, behavior: 'auto' })
  })

  it('coalesces several compensations into one scroll write', () => {
    const { api } = mountRows(10000)
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    scrollToSpy.mockClear()

    api.compensateScroll(10)
    api.compensateScroll(20)
    api.compensateScroll(30)
    flushFrames()

    expect(scrollToSpy).toHaveBeenCalledTimes(1)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 60, behavior: 'auto' })
  })

  it('compensation does not count as user scrolling', () => {
    const { api } = mountRows(10000)
    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    expect(api.settled).toBe(true)

    api.compensateScroll(50)
    flushFrames()
    // The programmatic write fires a scroll event; it must not unsettle the list.
    window.dispatchEvent(new Event('scroll'))
    expect(api.settled).toBe(true)
  })

  it('scrollToOffset and scrollToIndex target the predicted offset', () => {
    const { api, store } = mountRows(10000)
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })

    api.scrollToOffset(1234)
    expect(scrollToSpy).toHaveBeenLastCalledWith({
      top: 1234,
      behavior: 'auto'
    })

    store.setSize(0, 100)
    api.scrollToIndex(2)
    // Row 0 measured at 100px, row 1 still the 40px estimate.
    expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 140, behavior: 'auto' })
  })
})
