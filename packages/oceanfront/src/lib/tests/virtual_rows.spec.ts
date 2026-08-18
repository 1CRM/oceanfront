import { computed, defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_RENDERED_ROWS,
  VIRTUAL_SCROLL_FAST_SAMPLES,
  VIRTUAL_SCROLL_SETTLE_MAX_MS,
  VIRTUAL_SCROLL_SETTLE_MS,
  computeVirtualWindow,
  findScrollParent,
  getScrollTop,
  isActivelyWindowing,
  setScrollTop,
  useVirtualRows,
  type VirtualRowsRange
} from '../virtual_rows'
import { useDataTableVirtualScroll } from '../data_table_virtual_scroll'
import {
  RowMetrics,
  createFixedRowMetrics,
  createRowHeightStore,
  type RowHeightSnapshot
} from '../virtual_row_heights'

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

/**
 * Waits out the adaptive settle delay (use the ceiling, not the floor).
 */
const settleScroll = () =>
  vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MAX_MS + 10)

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
    // After settle, overscan is back to the resting window.
    settleScroll()

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

    settleScroll()
    expect(api.settled).toBe(true)
  })

  it('emits the settled window once a fling ends', async () => {
    const { api, ranges } = mountRows(10000)
    setPageOffset(40000)
    flushFrames()
    await nextTick()
    expect(ranges.at(-1)?.settled).toBe(false)

    settleScroll()
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

  it('does not treat laggy sub-viewport jumps as a fling', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()

    // Slow scrolling plus an expensive window can coalesce into a jump of
    // most of a viewport. The previous rows are still on screen, so swapping
    // them for skeletons is a flash, not a shortcut.
    for (
      let offset = 100;
      offset <= 100 + VIEWPORT * 3;
      offset += VIEWPORT * 0.5
    ) {
      setPageOffset(offset)
      expect(api.isFastScrolling).toBe(false)
    }
  })

  it('does not enter fling mode on a single oversized jump', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()

    // One coalesced sample (a laggy frame, one wheel burst) must not destroy
    // every on-screen row. A real fling keeps producing oversized jumps.
    setPageOffset(100 + VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(false)
  })

  it('enters fling mode on consecutive oversized jumps', () => {
    const { api } = mountRows(10000)
    flingBy(100, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)
  })

  it('holds fling mode through ordinary samples until settle', () => {
    const { api } = mountRows(10000)
    flingBy(100, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)

    // A calm mid-gesture sample must not drop fling mode.
    setPageOffset(100 + (VIEWPORT + 100) * VIRTUAL_SCROLL_FAST_SAMPLES + 200)
    expect(api.isFastScrolling).toBe(true)

    settleScroll()
    expect(api.isFastScrolling).toBe(false)
  })

  it('keeps a viewport window while flinging, and spacers hold the rest', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)

    flingBy(100, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)
    expect(api.rangeStart).toBeGreaterThan(0)
    const windowHeight = (api.rangeEnd - api.rangeStart) * ROW_HEIGHT
    expect(api.topSpacerHeight + windowHeight + api.bottomSpacerHeight).toBe(
      10000 * ROW_HEIGHT
    )

    settleScroll()
    expect(api.isFastScrolling).toBe(false)
    expect(api.rangeEnd).toBeGreaterThan(api.rangeStart)
  })

  it('keeps the window on the viewport through a fling', async () => {
    const { api, ranges } = mountRows(10000)
    flingBy(100, 40000)
    expect(api.isFastScrolling).toBe(true)
    await nextTick()
    const startAtEngage = api.rangeStart

    // The window must follow; otherwise the viewport lands on empty spacers.
    for (const offset of [120000, 160000, 210000]) {
      setPageOffset(offset)
      await nextTick()
      expect(api.settled).toBe(false)
      expect(api.isFastScrolling).toBe(true)
      expect(api.rangeStart).toBeGreaterThan(startAtEngage)
      const expectedIndex = Math.floor(offset / ROW_HEIGHT)
      expect(api.rangeStart).toBeLessThanOrEqual(expectedIndex)
      expect(api.rangeEnd).toBeGreaterThan(expectedIndex)
    }
    expect(ranges.at(-1)?.settled).toBe(false)

    settleScroll()
    await nextTick()
    expect(api.rangeStart).toBeGreaterThan(startAtEngage)
    expect(ranges.at(-1)?.settled).toBe(true)
    expect(ranges.at(-1)?.start).toBe(api.rangeStart)
  })

  it('flags a fling even when rendering is slow enough to space the samples out', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)

    // Samples 200ms apart still look fast when judged by distance, not speed.
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

    // A height correction in flight must not consume the user's own sample.
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

    // Browser moved the offset because the page shrank, not because the user flung.
    setPageHeight(CONTAINER_HEIGHT - 4000)
    setPageOffset(4100)

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

    // Only the part of the jump the height change can account for is discounted.
    setPageHeight(CONTAINER_HEIGHT + 600)
    setPageOffset(40100)
    setPageHeight(CONTAINER_HEIGHT + 900)
    setPageOffset(80100)

    expect(api.isFastScrolling).toBe(true)
  })

  it('stays unsettled between samples when a window costs more than the settle delay', async () => {
    const { api, ranges } = mountRows(10000)
    const settles = () => ranges.filter((r) => r.settled).length
    const atRest = settles()
    const step = VIEWPORT + 100
    const cost = VIRTUAL_SCROLL_SETTLE_MS * 2
    let offset = 40000
    setPageOffset(offset)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(cost)
      await nextTick()
      offset += step
      setPageOffset(offset)
      await nextTick()
    }
    expect(api.isFastScrolling).toBe(true)

    // Adaptive delay: at most one extra settle during a slow gesture.
    expect(settles()).toBeLessThanOrEqual(atRest + 1)
    const duringGesture = settles()

    settleScroll()
    await nextTick()
    expect(api.isScrolling).toBe(false)
    expect(api.isFastScrolling).toBe(false)
    expect(settles()).toBe(duringGesture + 1)
  })

  it('caps the settle delay so a stalled gesture still ends', () => {
    const { api } = mountRows(10000)
    setPageOffset(40000)
    vi.advanceTimersByTime(5000)
    setPageOffset(40000 + VIEWPORT + 100)

    settleScroll()
    expect(api.isScrolling).toBe(false)
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

    expect(api.scrolledPast).toBe(40000)
    expect(api.rangeStart).toBeLessThanOrEqual(1000)
    expect(api.rangeStart).toBeGreaterThan(900)
    expect(api.rangeEnd).toBeGreaterThan(1000)
  })

  it('keeps following the offset between sparse scroll events while scrolling', () => {
    const { api } = mountRows(10000)
    setPageOffset(100)
    flushFrames()

    // rAF follow must move the window between sparse scroll events.
    setPageOffset(200)
    expect(api.isScrolling).toBe(true)
    expect(api.isFastScrolling).toBe(false)
    pageOffset = 8000
    flushFrames(16)
    expect(api.scrolledPast).toBe(8000)
    expect(api.rangeStart).toBeGreaterThan(100)
  })

  it('widens the window while flinging and restores overscan on settle', () => {
    const { api } = mountRows(10000)
    setPageOffset(40000)
    flushFrames()
    settleScroll()
    const settledRows = api.rangeEnd - api.rangeStart

    flingBy(40000, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)
    expect(api.rangeEnd - api.rangeStart).toBeGreaterThan(settledRows)

    settleScroll()
    expect(api.isFastScrolling).toBe(false)
    expect(api.rangeEnd - api.rangeStart).toBeLessThan(settledRows * 2)
  })

  it('spends the fling margin ahead of the direction of travel', () => {
    const { api } = mountRows(10000)
    setPageOffset(40000)
    flushFrames()
    const visibleFirst = 40000 / ROW_HEIGHT

    flingBy(40000, VIEWPORT + 100)
    expect(api.isFastScrolling).toBe(true)
    const down = {
      lead: visibleFirst - api.rangeStart,
      trail: api.rangeEnd - (visibleFirst + VIEWPORT / ROW_HEIGHT)
    }
    expect(down.trail).toBeGreaterThan(down.lead)

    settleScroll()
    flingBy(40000, -(VIEWPORT + 100))
    expect(api.isFastScrolling).toBe(true)
    expect(
      api.rangeEnd - (40000 / ROW_HEIGHT + VIEWPORT / ROW_HEIGHT)
    ).toBeLessThan(40000 / ROW_HEIGHT - api.rangeStart)
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
    settleScroll()
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

/** Deterministic RowMetrics built from an explicit list of row heights, for tests. */
function metricsFromHeights(heights: number[]): RowMetrics {
  const offsets: number[] = []
  let running = 0
  for (const h of heights) {
    offsets.push(running)
    running += h
  }
  const total = running
  return {
    version: ref(0),
    offsetOf: (index) =>
      offsets[Math.max(0, Math.min(heights.length - 1, index))] ?? total,
    totalHeight: () => total,
    indexAtOffset: (offset, count) => {
      const clamped = Math.max(0, offset)
      let idx = 0
      for (let i = 0; i < heights.length; i++) {
        if (offsets[i] <= clamped) idx = i
        else break
      }
      return Math.max(0, Math.min(count - 1, idx))
    }
  }
}

describe('computeVirtualWindow', () => {
  it('returns an empty window when there are no rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 0,
      viewportHeight: 500,
      metrics,
      totalCount: 0,
      overscan: 5,
      rangeStep: 5
    })
    expect(result).toEqual({
      start: 0,
      end: 0,
      topSpacer: 0,
      bottomSpacer: 0
    })
  })

  it('covers the viewport plus overscan for uniform rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 400, // row 10
      viewportHeight: 200, // rows 10..15
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 5
    })
    // start = max(0, 10 - overscan 10) snapped to 5 => 0
    expect(result.start).toBe(0)
    expect(result.end).toBe(26)
    expect(result.topSpacer).toBe(0)
    expect(result.bottomSpacer).toBe((1000 - 26) * 40)
  })

  it('spacers always span the whole list, not just loaded rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 200,
      metrics,
      totalCount: 50000,
      overscan: 10,
      rangeStep: 5
    })
    const windowHeight = (result.end - result.start) * 40
    expect(result.topSpacer + windowHeight + result.bottomSpacer).toBe(
      50000 * 40
    )
  })

  it('drops overscan when the viewport already fills the render cap', () => {
    const metrics = createFixedRowMetrics(20)
    // 4000px / 20px = 200 visible rows.
    const result = computeVirtualWindow({
      scrolledPast: 20000,
      viewportHeight: 4000,
      metrics,
      totalCount: 100000,
      overscan: 50,
      rangeStep: 5
    })
    const firstVisible = 1000
    const lastVisible = 1200
    expect(result.start).toBeLessThanOrEqual(firstVisible)
    expect(result.end).toBeGreaterThan(lastVisible)
    expect(result.end - result.start).toBeLessThanOrEqual(
      lastVisible - firstVisible + 1 + 5
    )
  })

  it('never clips the visible viewport to fit the render cap', () => {
    const metrics = createFixedRowMetrics(20)
    const result = computeVirtualWindow({
      scrolledPast: 0,
      viewportHeight: 5000,
      metrics,
      totalCount: 1000,
      overscan: 50,
      rangeStep: 5,
      maxRenderedRows: 40
    })
    // 5000px / 20px = 250 visible rows; the cap must not hide them.
    expect(result.start).toBe(0)
    expect(result.end).toBeGreaterThanOrEqual(250)
  })

  it('keeps the window to the viewport plus overscan, not the render cap', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 400,
      metrics,
      totalCount: 10000,
      overscan: 5,
      rangeStep: 5
    })
    // ~10 visible + 5 overscan each side + snap, far below MAX_RENDERED_ROWS.
    expect(result.end - result.start).toBeGreaterThanOrEqual(10)
    expect(result.end - result.start).toBeLessThanOrEqual(30)
    expect(result.end - result.start).toBeLessThan(MAX_RENDERED_ROWS)
  })

  it('honours an explicit lower render cap', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 800,
      metrics,
      totalCount: 10000,
      overscan: 30,
      rangeStep: 5,
      maxRenderedRows: 40
    })
    expect(result.end - result.start).toBeLessThanOrEqual(40)
  })

  it('keeps fling overscan biased ahead of travel when the budget is tight', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 200,
      metrics,
      totalCount: 1000,
      overscan: 20,
      overscanLead: 5,
      overscanTrail: 20,
      rangeStep: 1,
      maxRenderedRows: 16
    })
    const firstVisible = 100
    const coreEnd = 106
    expect(result.start).toBeLessThan(firstVisible)
    expect(result.end).toBeGreaterThan(coreEnd)
    expect(result.end - coreEnd).toBeGreaterThan(firstVisible - result.start)
  })

  it('splits a tight render budget between leading and trailing overscan', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000, // row 100
      viewportHeight: 200, // rows 100..105 = 6 rows
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 1,
      maxRenderedRows: 10
    })
    // 10 - 6 visible = 4 rows of budget, 2 above and 2 below.
    expect(result.start).toBe(98)
    expect(result.end).toBe(108)
  })

  it('accounts for wrapped rows of varying height instead of assuming uniform rows', () => {
    // 10 rows: every 3rd row wraps to 120px, others are 40px.
    const heights = [40, 40, 120, 40, 40, 120, 40, 40, 120, 40]
    const metrics = metricsFromHeights(heights)
    const total = heights.reduce((a, b) => a + b, 0)

    const result = computeVirtualWindow({
      scrolledPast: 80,
      viewportHeight: 160,
      metrics,
      totalCount: heights.length,
      overscan: 1,
      rangeStep: 1
    })

    // offsets: [0,40,80,200,240,280,400,440,480,600]
    // indexAtOffset(80) => row 2, one row of leading overscan => 1
    expect(result.start).toBe(1)
    expect(result.topSpacer).toBe(metrics.offsetOf(1))
    // indexAtOffset(240) => row 4, +1 +1 trailing overscan => 6
    expect(result.end).toBe(6)
    expect(result.bottomSpacer).toBe(total - metrics.offsetOf(6))
  })

  it('never lets end fall below start even with a large overscan', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 0,
      viewportHeight: 10,
      metrics,
      totalCount: 3,
      overscan: 100,
      rangeStep: 1
    })
    expect(result.end).toBeGreaterThanOrEqual(result.start)
    expect(result.end).toBeLessThanOrEqual(3)
  })
})

describe('isActivelyWindowing', () => {
  it('is false when the rendered window already covers every row', () => {
    expect(isActivelyWindowing(0, 12, 12)).toBe(false)
    expect(isActivelyWindowing(0, 0, 0)).toBe(false)
  })

  it('is true when rows exist outside the rendered window', () => {
    expect(isActivelyWindowing(0, 40, 200)).toBe(true)
    expect(isActivelyWindowing(50, 200, 200)).toBe(true)
    expect(isActivelyWindowing(20, 60, 200)).toBe(true)
  })
})

describe('findScrollParent', () => {
  it('returns window when no ancestor overflows', () => {
    const child = document.createElement('div')
    const parent = document.createElement('div')
    parent.appendChild(child)
    document.body.appendChild(parent)
    expect(findScrollParent(child)).toBe(window)
    document.body.removeChild(parent)
  })

  it('returns the overflowing ancestor once it can scroll', () => {
    const child = document.createElement('div')
    const parent = document.createElement('div')
    parent.appendChild(child)
    document.body.appendChild(parent)

    Object.defineProperty(parent, 'scrollHeight', {
      value: 100,
      configurable: true
    })
    Object.defineProperty(parent, 'clientHeight', {
      value: 100,
      configurable: true
    })
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (el) =>
        ({
          overflowY: el === parent ? 'auto' : 'visible'
        }) as CSSStyleDeclaration
    )

    expect(findScrollParent(child)).toBe(window)

    Object.defineProperty(parent, 'scrollHeight', {
      value: 400,
      configurable: true
    })
    expect(findScrollParent(child)).toBe(parent)

    vi.restoreAllMocks()
    document.body.removeChild(parent)
  })
})

describe('getScrollTop / setScrollTop', () => {
  it('reads and writes an element scroll root', () => {
    const el = document.createElement('div')
    el.scrollTop = 12
    expect(getScrollTop(el)).toBe(12)
    setScrollTop(el, 40)
    expect(el.scrollTop).toBe(40)
  })
})

const mountTableScroll = (opts?: {
  rowHeights?: Ref<RowHeightSnapshot | undefined>
  heightsKey?: Ref<string | undefined>
  maxTrackedRowHeights?: number
}) => {
  const Harness = defineComponent({
    setup(_props, { expose }) {
      const container = ref<HTMLDivElement>()
      const api = useDataTableVirtualScroll({
        containerRef: container,
        enabled: computed(() => true),
        rows: computed(() => []),
        density: computed(() => 2),
        rowHeightOverride: computed(() => undefined),
        totalRows: computed(() => TOTAL_ROWS),
        rowHeights: computed(() => opts?.rowHeights?.value),
        heightsKey: computed(() => opts?.heightsKey?.value),
        maxTrackedRowHeights: opts?.maxTrackedRowHeights
      })
      expose(api)
      return () => h('div', { ref: container })
    }
  })
  const wrapper = mount(Harness, { attachTo: document.body })
  return { wrapper, api: wrapper.vm as any }
}

describe('useDataTableVirtualScroll', () => {
  it('compensates scroll when a row above the window changes height', async () => {
    const { api } = mountTableScroll()
    await nextTick()
    setPageOffset(40000)
    flushFrames()
    settleScroll()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40000
    })
    scrollToSpy.mockClear()

    const before = api.rowHeightAt(3)
    api.reportRowHeight(3, before + 24)
    flushFrames()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 40024, behavior: 'auto' })
  })

  it('does not compensate for rows inside the window', async () => {
    const { api } = mountTableScroll()
    await nextTick()
    setPageOffset(40000)
    flushFrames()
    settleScroll()
    scrollToSpy.mockClear()

    const inside = api.rangeStart + 2
    api.reportRowHeight(inside, api.rowHeightAt(inside) + 24)
    flushFrames()
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('compensates scroll when LRU eviction shrinks height above the window', async () => {
    const maxTracked = 4
    const measured = 80
    const { api } = mountTableScroll({ maxTrackedRowHeights: maxTracked })
    await nextTick()

    for (let i = 0; i < maxTracked; i++) api.reportRowHeight(i, measured)

    setPageOffset(40000)
    flushFrames()
    settleScroll()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40000
    })
    scrollToSpy.mockClear()

    expect(api.rangeStart).toBeGreaterThan(maxTracked)

    const inside = api.rangeStart + 2
    const estimate = api.rowHeightAt(inside)
    api.reportRowHeight(inside, estimate + 24)
    flushFrames()

    // In-window growth must not shift scroll; evicting row 0 (80 → estimate) must.
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 40000 + (estimate - measured),
      behavior: 'auto'
    })
  })

  it('hydrates rowHeights that arrive after mount with the same heightsKey', async () => {
    const rowHeights = ref<RowHeightSnapshot | undefined>(undefined)
    const { api } = mountTableScroll({
      rowHeights,
      heightsKey: ref('Accounts|list')
    })
    await nextTick()

    const estimate = api.rowHeightAt(7)
    expect(estimate).toBeGreaterThan(0)

    rowHeights.value = { estimate: 32, sizes: [[7, 80]] }
    await nextTick()

    expect(api.rowHeightAt(7)).toBe(80)
  })

  it('replaces live measurements when a late rowHeights snapshot arrives', async () => {
    const rowHeights = ref<RowHeightSnapshot | undefined>(undefined)
    const { api } = mountTableScroll({
      rowHeights,
      heightsKey: ref('Accounts|list')
    })
    await nextTick()

    api.reportRowHeight(0, 50)
    expect(api.rowHeightAt(0)).toBe(50)

    rowHeights.value = {
      estimate: 32,
      sizes: [
        [0, 80],
        [3, 90]
      ]
    }
    await nextTick()

    expect(api.rowHeightAt(0)).toBe(80)
    expect(api.rowHeightAt(3)).toBe(90)
  })
})
